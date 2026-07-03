import { AnalysisReviewForm } from '@/components/analysis-review-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnalysisJobPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="review-shell">
      <AnalysisReviewForm jobId={id} />
    </main>
  );
}
