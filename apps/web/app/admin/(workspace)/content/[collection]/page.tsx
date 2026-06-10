import { ContentCollectionRoute } from "@/app/admin/_screens/content-collection";

type AdminCollectionPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminCollectionPage({ params }: AdminCollectionPageProps) {
  return <ContentCollectionRoute collectionName={params.collection} />;
}
