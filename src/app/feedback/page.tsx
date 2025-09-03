import { Suspense } from 'react';
import FeedbackContent from './FeedbackContent';

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackContent />
    </Suspense>
  );
}