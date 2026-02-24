
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  onClick: () => void;
  className?: string;
}

export function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  buttonText, 
  onClick, 
  className 
}: FeatureCardProps) {
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-forest-500" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Additional content can go here */}
      </CardContent>
      <CardFooter>
        <Button 
          variant="default" 
          className="w-full"
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
