import { NextRequest, NextResponse } from "next/server";
import { indexer } from "@/lib/server/db/indexer";
import { eq, sql, desc, max, and, asc } from "drizzle-orm";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import {
  BFFCollectionGroup,
  BFFCollectionGroupObjekt,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import { parseUserCollectionGroups } from "@/lib/universal/parsers";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withTransferable,
} from "@/lib/server/objekts/filters";
import { PgSelect } from "drizzle-orm/pg-core";
import { ValidSort } from "@/lib/universal/cosmo/common";
import { nonTransferableReason } from "@/lib/server/objekts/prefetching/common";

const PER_PAGE = 30;

type Props = {
  params: Promise<{
    address: string;
  }>;
};

export async function GET(request: NextRequest, props: Props) {
  const { address } = await props.params;

  const filters = parseUserCollectionGroups(request.nextUrl.searchParams);
  const offset = (filters.page - 1) * PER_PAGE;

  try {
    // main query with pagination and filters
    let query = indexer
      .select({
        collection: {
          collectionId: collections.collectionId,
          season: collections.season,
          collectionNo: collections.collectionNo,
          class: collections.class,
          member: collections.member,
          artistMember: sql<null>`null`,
          artistName: collections.artist,
          thumbnailImage: collections.thumbnailImage,
          frontImage: collections.frontImage,
          backImage: collections.backImage,
          accentColor: collections.accentColor,
          backgroundColor: collections.backgroundColor,
          textColor: collections.textColor,
          comoAmount: collections.comoAmount,
          transferableByDefault: sql<boolean>`true`,
          gridableByDefault: sql<boolean>`false`,
          createdAt: collections.createdAt,
          updatedAt: collections.createdAt, // using createdAt as a fallback
        },
        // use a window function to get the total count without pagination
        totalCount: sql<number>`count(*) over()`.mapWith(Number),
        // calculate the newest receivedAt date for sorting
        newestReceivedAt: max(objekts.receivedAt),
        objekts: sql<BFFCollectionGroupObjekt[]>`array_agg(
          jsonb_build_object(
            'metadata', jsonb_build_object(
              'collectionId', ${collections.collectionId},
              'objektNo', ${objekts.serial},
              'tokenId', ${objekts.id},
              'transferable', ${objekts.transferable}
            ),
            'inventory', jsonb_build_object(
              'objektId', ${objekts.id},
              'owner', ${objekts.owner},
              'status', 'minted',
              'usedForGrid', false,
              'lenticularPairTokenId', 0,
              'mintedAt', ${objekts.mintedAt},
              'acquiredAt', ${objekts.receivedAt},
              'updatedAt', ${objekts.receivedAt}
            )
          )
        )`,
      })
      .from(collections)
      .innerJoin(objekts, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(objekts.owner, address.toLowerCase()),
          ...[
            ...withArtist(filters.artistName),
            ...withClass(filters.class),
            ...withSeason(filters.season),
            ...withOnlineType(filters.on_offline),
            ...withMember(filters.member),
            ...withTransferable(filters.transferable),
          ]
        )
      )
      .groupBy(
        collections.id,
        collections.collectionId,
        collections.season,
        collections.collectionNo,
        collections.class,
        collections.member,
        collections.artist,
        collections.thumbnailImage,
        collections.frontImage,
        collections.backImage,
        collections.accentColor,
        collections.backgroundColor,
        collections.textColor,
        collections.comoAmount,
        collections.createdAt
      )
      .$dynamic();

    query = withObjektGroupSort(query, filters.order);
    query = query.limit(PER_PAGE).offset(offset);

    const result = await query;

    // pull total collection count off the first row
    const totalCount = result?.[0]?.totalCount ?? 0;

    // format the response to match the required structure
    const response = {
      collectionCount: totalCount,
      collections: result.map((item): BFFCollectionGroup => {
        const objekts = (item.objekts || []).map((objekt) => {
          // apply the non-transferable reason to each objekt
          return {
            ...objekt,
            nonTransferableReason: nonTransferableReason(
              item.collection.class,
              objekt.metadata.transferable
            ),
          };
        });

        return {
          // @ts-ignore - can't pull artistMember from the indexer
          collection: item.collection,
          count: objekts.length,
          objekts,
        };
      }),
    } satisfies BFFCollectionGroupResponse;

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching collection groups:", error);
    return NextResponse.json({
      collectionCount: 0,
      collections: [],
    });
  }
}

/**
 * Custom sorting filters as collection groups have a different mechanism for sorting.
 */
export function withObjektGroupSort<T extends PgSelect>(
  qb: T,
  sort: ValidSort
) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(max(objekts.receivedAt)));
    case "oldest":
      return qb.orderBy(asc(max(objekts.receivedAt)));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo));
    case "serialAsc":
      return qb.orderBy(asc(max(objekts.serial)));
    case "serialDesc":
      return qb.orderBy(desc(max(objekts.serial)));
  }
}
