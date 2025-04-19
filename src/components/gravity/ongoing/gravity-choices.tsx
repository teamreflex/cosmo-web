import {
  PollSelectedContentImageContent,
  PollViewDefaultContent,
  PollViewSelectedContent,
} from "@/lib/universal/cosmo/gravity";
import Image from "next/image";

export function ChoiceRenderer({
  choice,
}: {
  choice: PollViewSelectedContent;
}) {
  return (
    <ContentImage
      imageUrl={choice.content.imageUrl}
      title={choice.content.title}
      description={choice.content.description}
    />
  );
}

export function DefaultContent({
  content,
}: {
  content: PollViewDefaultContent;
}) {
  if (content.type === "image") {
    return <ContentImage {...content} />;
  }

  return null;
}

export function ContentImage({
  imageUrl,
  title,
  description,
}: Omit<PollSelectedContentImageContent, "type">) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="relative w-48 aspect-square rounded-lg overflow-hidden">
        <Image src={imageUrl} alt={title} fill={true} />
      </div>

      <div className="text-center font-semibold">
        <p>{title}</p>
        {description.split("\n").map((s, i) => (
          <p className="text-sm" key={i}>
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}
