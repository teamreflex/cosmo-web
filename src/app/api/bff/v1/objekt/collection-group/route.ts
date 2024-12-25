import { withCosmoApi } from "@/lib/server/cosmo/withCosmoApi";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import {
  BFFCollectionGroupParams,
  BFFCollectionGroupResponse,
  parseBffCollectionGroupParams,
} from "@/lib/universal/cosmo/objekts";
import {
  aliasedTable,
  and,
  count,
  countDistinct,
  desc,
  eq,
  max,
  sql,
} from "drizzle-orm";

/**
 * API route that services the /news/feed page.
 */
export const GET = withCosmoApi(async ({ req, user }) => {
  const params = parseBffCollectionGroupParams(req.nextUrl.searchParams);

  const results: BFFCollectionGroupResponse =
    await fetchIndexerCollectionGroups(user.address, params);

  return Response.json(results);
});

async function fetchIndexerCollectionGroups(
  address: string,
  params: BFFCollectionGroupParams
) {
  // indexer addresses are lowercase
  address = address.toLowerCase();

  const objektsAlias = aliasedTable(objekts, "o");
  const collectionsAlias = aliasedTable(collections, "c");

  const where = and(
    eq(objektsAlias.owner, address),
    eq(collectionsAlias.artist, params.artistName),
    eq(collectionsAlias.class, "First")
  );

  const query = sql<BFFCollectionGroupResponse>`
    WITH
	collection_ct AS (
		SELECT
			COUNT(DISTINCT c.id) AS "collectionCount"
		FROM
			"collection" c
			JOIN "objekt" o ON o.collection_id = c.id
		WHERE
			${where}
	),
	collection_data AS (
		SELECT
			c.id AS "idRef",
			c.collection_id AS "collectionId",
			c.season,
			c.collection_no AS "collectionNo",
			c.class,
			c.member,
			c.artist AS "artistName",
			c.thumbnail_image AS "thumbnailImage",
			c.front_image AS "frontImage",
			c.back_image AS "backImage",
			c.accent_color AS "accentColor",
			c.background_color AS "backgroundColor",
			c.text_color AS "textColor",
			c.como_amount AS "comoAmount",
			c.created_at AS "createdAt",
			MAX(o.received_at) AS "latestReceivedAt"
		FROM
			"collection" c
			JOIN "objekt" o ON o.collection_id = c.id
		WHERE
      ${where}
		GROUP BY
			c.id
		ORDER BY
			MAX(o.received_at) DESC
		LIMIT
			${params.size}
		OFFSET
			${(params.page - 1) * params.size}
	)
SELECT
	(
		SELECT
			"collectionCount"
		FROM
			collection_ct
	) AS "collectionCount",
	JSON_AGG(
		JSON_BUILD_OBJECT(
			'collection',
			JSON_BUILD_OBJECT(
				'collectionId',
				cd."collectionId",
				'season',
				cd.season,
				'collectionNo',
				cd."collectionNo",
				'class',
				cd.class,
				'member',
				cd.member,
				'artistMember',
				NULL,
				'artistName',
				cd."artistName",
				'thumbnailImage',
				cd."thumbnailImage",
				'frontImage',
				cd."frontImage",
				'backImage',
				cd."backImage",
				'accentColor',
				cd."accentColor",
				'backgroundColor',
				cd."backgroundColor",
				'textColor',
				cd."textColor",
				'comoAmount',
				cd."comoAmount",
				'transferableByDefault',
				NULL,
				'gridableByDefault',
				NULL,
				'createdAt',
				cd."createdAt",
				'updatedAt',
				cd."createdAt" -- using createdAt for both
			),
			'count',
			(
				SELECT
					COUNT(*)
				FROM
					"objekt" o
				WHERE
					o.collection_id = cd."idRef"
					AND o.owner = ${address}
			),
			'objekts',
			(
				SELECT
					JSON_AGG(
						JSON_BUILD_OBJECT(
							'metadata',
							JSON_BUILD_OBJECT('collectionId', cd."collectionId", 'objektNo', o.serial, 'tokenId', o.id, 'transferable', o.transferable),
							'inventory',
							JSON_BUILD_OBJECT('objektId', o.id, 'owner', o.owner, 'status', 'minted', 'usedForGrid', FALSE, 'mintedAt', o.minted_at, 'lenticularPairTokenId', 0, 'acquiredAt', o.received_at, 'updatedAt', o.received_at)
						)
					)
				FROM
					"objekt" o
				WHERE
					o.collection_id = cd."idRef"
					AND o.owner = ${address}
			)
		)
	) AS "collections"
FROM
	collection_data cd;
  `;

  const [results] = await indexer.execute<BFFCollectionGroupResponse>(query);
  return results;
}
