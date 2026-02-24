
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tag } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { generateDocumentLabels, createLabelHierarchy, applyCustomLabels, extractDomainEntities } from "@/services/api";

const Labeling = () => {
  const { token } = useAuth();
  const [documentId, setDocumentId] = useState("");
  const [maxLabels, setMaxLabels] = useState(10);
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleGenerateLabels = async () => {
    if (!documentId) {
      toast.error("Please enter a document ID");
      return;
    }

    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await generateDocumentLabels(documentId, token, maxLabels, minConfidence);
      
      if (response.error) {
        toast.error(response.error);
      } else if (response.data) {
        setResults(response.data);
        toast.success("Labels generated successfully!");
      }
    } catch (error) {
      console.error("Error generating labels:", error);
      toast.error("Failed to generate labels");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractEntities = async () => {
    if (!documentId) {
      toast.error("Please enter a document ID");
      return;
    }

    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await extractDomainEntities(documentId, token);
      
      if (response.error) {
        toast.error(response.error);
      } else if (response.data) {
        setResults(response.data);
        toast.success("Domain entities extracted successfully!");
      }
    } catch (error) {
      console.error("Error extracting entities:", error);
      toast.error("Failed to extract domain entities");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Document Labeling</h1>
        <p className="text-muted-foreground">
          Generate labels, create hierarchies, and extract domain-specific entities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Labels</CardTitle>
            <CardDescription>
              Automatically generate relevant labels for your document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-id">Document ID</Label>
              <Input 
                id="document-id"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Enter document ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-labels">Maximum Labels: {maxLabels}</Label>
              <Slider
                id="max-labels"
                min={1}
                max={20}
                step={1}
                value={[maxLabels]}
                onValueChange={(value) => setMaxLabels(value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min-confidence">Minimum Confidence: {minConfidence.toFixed(1)}</Label>
              <Slider
                id="min-confidence"
                min={0.1}
                max={1.0}
                step={0.1}
                value={[minConfidence]}
                onValueChange={(value) => setMinConfidence(value[0])}
              />
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                onClick={handleGenerateLabels} 
                disabled={isLoading || !documentId}
              >
                <Tag className="h-4 w-4 mr-2" />
                Generate Labels
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExtractEntities}
                disabled={isLoading || !documentId}
              >
                Extract Domain Entities
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              View the generated labels or extracted entities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading results...</p>
              </div>
            ) : results ? (
              <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Generate labels or extract entities to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Labeling;
