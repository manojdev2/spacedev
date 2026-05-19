import { useStoreRecommendations, StoreRecommendation } from '@/hooks/useStoreRecommendations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StoreRecommendationsProps {
  className?: string;
  limit?: number;
}

const categoryColors: Record<string, string> = {
  retail: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warehouse: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'service-center': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  headquarters: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  branch: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

function RecommendationCard({ recommendation }: { recommendation: StoreRecommendation }) {
  return (
    <Link 
      to={`/location/${recommendation.locationId}`}
      className="block group"
    >
      <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 group-hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {recommendation.name}
              </h4>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{recommendation.city}, {recommendation.state}</span>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className={cn("flex-shrink-0 text-xs", categoryColors[recommendation.category])}
            >
              {recommendation.category}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {recommendation.reason}
          </p>
          
          <div className="flex items-center justify-end mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View store</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-10 w-full mt-3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StoreRecommendations({ className, limit = 6 }: StoreRecommendationsProps) {
  const { recommendations, isPersonalized, message, isLoading, isAuthenticated, refetch } = 
    useStoreRecommendations(limit);

  if (!isAuthenticated) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-2">Personalized Recommendations</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Sign in to get AI-powered store recommendations based on your preferences
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Recommended for You</h3>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (message || recommendations.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-2">
            {message || "No recommendations yet"}
          </h3>
          <p className="text-muted-foreground text-sm">
            Browse more stores to get personalized recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Recommended for You</h3>
          {isPersonalized && (
            <Badge variant="secondary" className="text-xs">
              AI Personalized
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.locationId} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}
