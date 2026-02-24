import { UploadDocumentForm } from "@/components/UploadDocumentForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DocumentUpload = () => {
  const navigate = useNavigate();
  // useEffect(() => {
  //   let documentID = localStorage.getItem("lastUploadedDocumentId");
  //   if (documentID) navigate(`/documents/${documentID}`);
  // }, []);
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* <Button
        variant="outline"
        onClick={() => navigate("/documents")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Documents
      </Button> */}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Upload Document</h1>
        <p className="text-muted-foreground">
          Upload a document to analyze with our educational AI tools
        </p>
      </div>

      <UploadDocumentForm />
    </div>
  );
};

export default DocumentUpload;
