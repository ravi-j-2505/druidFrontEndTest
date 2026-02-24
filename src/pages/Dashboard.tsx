import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeatureCard } from "@/components/FeatureCard";
import { CacheManager } from "@/components/CacheManager";
import { useNavigate } from "react-router-dom";
import { FileText, FileUp, Layers, Search, Tag } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const recentDocuments = [
    {
      id: "1",
      name: "Business Textbook Chapter 2.pdf",
      type: "pdf",
      uploadDate: "2023-05-10",
    },
    {
      id: "2",
      name: "Data Analysis Report.pdf",
      type: "pdf",
      uploadDate: "2023-05-08",
    },
    {
      id: "3",
      name: "Learning Objective Graph.jpg",
      type: "image",
      uploadDate: "2023-05-05",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.username}!</h1>
        <p className="text-muted-foreground">
          Access powerful document analysis tools to enhance your learning
          content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">3</CardTitle>
            <CardDescription>Documents</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">12</CardTitle>
            <CardDescription>Labels Generated</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">5</CardTitle>
            <CardDescription>Summaries Created</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            title="Upload Document"
            description="Add new documents for analysis"
            icon={FileUp}
            buttonText="Upload"
            onClick={() => navigate("/documents/upload")}
          />
          <FeatureCard
            title="Extract Metadata"
            description="Extract educational metadata"
            icon={Layers}
            buttonText="Extract"
            onClick={() => navigate("/metadata")}
          />
          <FeatureCard
            title="Generate Labels"
            description="Create automatic labels"
            icon={Tag}
            buttonText="Generate"
            onClick={() => navigate("/labeling")}
          />
          <FeatureCard
            title="Summarize Content"
            description="Create educational summaries"
            icon={Search}
            buttonText="Summarize"
            onClick={() => navigate("/summarization")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Recent Documents</h2>
            <button
              className="text-forest-600 hover:underline"
              onClick={() => navigate("/documents")}
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-forest-500" />
                    <CardTitle className="text-md">{doc.name}</CardTitle>
                  </div>
                  <CardDescription>
                    Uploaded on {doc.uploadDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <button
                    className="text-forest-600 hover:underline text-sm"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    View Details
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Cache Management</h2>
          <CacheManager />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
