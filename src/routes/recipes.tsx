import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, Clock, Play } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_RECIPES } from "@/lib/ruralplan/recipes";
import { requireAuth } from "@/lib/auth-utils";

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function getYoutubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    
    // Handle youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get YouTube thumbnail URL for a video
 */
function getYoutubeThumbnail(url: string): string | null {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  
  // Use hqdefault for high quality thumbnail (480x360)
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export const Route = createFileRoute("/recipes")({
  beforeLoad: async () => {
    await requireAuth();
  },
  head: () => ({
    meta: [
      { title: "Recipes — RuralPlan" },
      {
        name: "description",
        content: "Browse traditional pickle recipes with ingredients, preparation steps, and video tutorials.",
      },
      { property: "og:title", content: "Recipes — RuralPlan" },
      {
        property: "og:description",
        content: "Learn how to make authentic Indian pickles with step-by-step recipes.",
      },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const navigate = useNavigate();

  const handleUseRecipe = (productName: string) => {
    navigate({
      to: "/planner",
      search: { product: productName },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Pickle Recipes"
        description="Traditional Indian pickle recipes with ingredients, preparation steps, and video tutorials."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCT_RECIPES.map((recipe) => (
          <Card key={recipe.productName} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                {recipe.productName}
              </CardTitle>
              <CardDescription>{recipe.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {/* Preparation Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                <span>Prep time: {recipe.preparationTimeMinutes} minutes</span>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Ingredients (per jar):</h3>
                <ul className="space-y-1 text-sm">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>
                        {ing.materialName}: {ing.quantityPerUnit} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preparation Steps */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Preparation Steps:</h3>
                <ol className="space-y-1 text-sm">
                  {recipe.preparationSteps.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{idx + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Video Tutorial with Thumbnail */}
              <div className="pt-2">
                {(() => {
                  const thumbnailUrl = getYoutubeThumbnail(recipe.youtubeUrl);
                  
                  if (thumbnailUrl) {
                    return (
                      <a
                        href={recipe.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <div className="relative overflow-hidden rounded-lg border border-border bg-muted transition-all hover:border-primary">
                          <img
                            src={thumbnailUrl}
                            alt={`${recipe.productName} video tutorial`}
                            className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback if thumbnail fails to load
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="%23f1f5f9"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="%2364748b" text-anchor="middle" dominant-baseline="middle">Video Tutorial</text></svg>';
                            }}
                          />
                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity group-hover:bg-black/40">
                            <div className="flex size-14 items-center justify-center rounded-full bg-red-600 transition-transform group-hover:scale-110">
                              <Play className="size-6 fill-white text-white" />
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-center text-sm text-muted-foreground group-hover:text-primary">
                          Watch Recipe
                        </p>
                      </a>
                    );
                  }
                  
                  // Fallback for search URLs or invalid YouTube URLs
                  return (
                    <a
                      href={recipe.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Play className="size-4" />
                      Watch video tutorial
                    </a>
                  );
                })()}
              </div>

              {/* Use Recipe Button */}
              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => handleUseRecipe(recipe.productName)}
                >
                  Use This Recipe
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
