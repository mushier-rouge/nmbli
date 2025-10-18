import { Badge } from '@/components/ui/badge';

export function ShadinessPill({ score }: { score: number }) {
  const level = score <= 25 ? 'Low' : score <= 60 ? 'Medium' : 'High';
  const variant: 'outline' | 'secondary' | 'destructive' =
    level === 'Low' ? 'outline' : level === 'Medium' ? 'secondary' : 'destructive';
  return (
    <Badge variant={variant} className="capitalize">
      Shadiness: {level}
    </Badge>
  );
}
