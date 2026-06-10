import { ContentEditorRoute } from "../../../_screens/content-editor";

type AdminNewRecordPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminNewRecordPage({ params }: AdminNewRecordPageProps) {
  return <ContentEditorRoute collectionName={params.collection} mode="create" />;
}
