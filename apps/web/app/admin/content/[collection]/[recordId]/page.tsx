import { ContentEditorRoute } from "../../../_screens/content-editor";

type AdminRecordDetailPageProps = {
  params: {
    collection: string;
    recordId: string;
  };
};

export default function AdminRecordDetailPage({
  params,
}: AdminRecordDetailPageProps) {
  return (
    <ContentEditorRoute
      collectionName={params.collection}
      mode="edit"
      recordId={params.recordId}
    />
  );
}
