
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, FileImage, FileVideo, FileAudio, Trash2Icon } from "lucide-react";

export interface DocumentCardProps {
  id: string;
  name: string;
  mimeType: string;
  uploadDate: string;
  labels?: string[];
  onView: () => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ id, name, mimeType, uploadDate, labels, onView, onDelete }: DocumentCardProps) {
  const getIcon = () => {

    if (mimeType.startsWith('image/')) {
      return <FileImage className="w-8 h-8 me-2 text-blue-500" />;
    }

    if (mimeType.startsWith('video/')) {
      return <FileVideo className="w-8 h-8 me-2 text-red-500" />;
    }

    if (mimeType.startsWith('audio/')) {
      return <FileAudio className="w-7 h-7 me-2 text-red-500" />;
    }

    return <FileText className="w-8 h-8 me-2 text-forest-500" />;
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow" style={{display: 'flex', flexDirection:'column'}}>
      <CardHeader className="pb-2">
        <div className="flex w-full items-start justify-start">
          <div className="flex w-full items-start">
            {getIcon()}
            <CardTitle className="text-md line-clamp-1 w-full">{name}</CardTitle>
          </div>
          <button type="button" className="text-red" onClick={() => onDelete(id)}>
            <Trash2Icon stroke="red"/>
          </button>
        </div>
        <div className="flex w-full justify-between items-center">
          <CardDescription>Uploaded on {uploadDate}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pb-2" style={{flexGrow: 1}}>
        {labels && labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {labels.slice(0, 3).map((label, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
            {labels.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{labels.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="default" 
          size="sm" 
          className="w-full"
          onClick={onView}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
