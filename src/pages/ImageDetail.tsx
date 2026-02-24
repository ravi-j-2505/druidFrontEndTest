import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Download, FileText, Pencil, Tag } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ResponseDisplay from "@/components/ResponseDisplay";
import {
  getDocument,
  getDocumentMetadata,
  generateDocumentLabels,
  extractEducationalMetadata,
  summarizeDocument,
  getExcelMetadata,
  getChapterLabels,
} from "@/services/api";

const ImageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metadataResponse, setMetadataResponse] = useState<any>(null);
  const [labelsResponse, setLabelsResponse] = useState<any>(null);
  const [chapterLabelsResponse, setChapterLabelsResponse] = useState<any>(null);
  const [summaryResponse, setSummaryResponse] = useState<any>(null);
  const [excelMetadataResponse, setExcelMetadataResponse] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [excelMetadataLoading, setExcelMetadataLoading] = useState(false);
  const [documentInfo, setDocumentInfo] = useState<any>(false);
  const [extraLoading, setExtraLoading] = useState<any>(false);
  // Load document data on component mount
  useEffect(() => {
    const fetchDocument = async () => {
      if (!id || !token) return;

      setLoading(true);
      try {
        const response = await getDocument(id, token);
        if (response.data) {
          const document = response.data;
          setDocumentData(document);

          if (document.extended?.image_metadata) {
            setDocumentInfo({
              title: document.filename,
              mime_type: document.metadata.mime_type,
              resolution: document.extended.image_metadata.resolution,
              file_size_bytes: document.extended.image_metadata.file_size_bytes,
              color_space: document.extended.image_metadata.color_space,
              bit_depth: document.extended.image_metadata.bit_depth,
            });
          }

          setSummaryResponse({
            summary: document?.educational_metadata?.summary,
            sections: document?.educational_metadata?.document_sections,
          });

          setLabelsResponse(document.labels);

          // Set chapter labels if available
          if (document.chapter_labels) {
            setChapterLabelsResponse(document.chapter_labels);
          } else {
            // Fetch chapter labels if not available
            setLabelsLoading(true);
            setExtraLoading(true);

            const labelResponse = await getChapterLabels(id, token);
            console.log("labelResponse", labelResponse);
            if (labelResponse.data) {
              setChapterLabelsResponse(labelResponse.data?.labels);
            }
            setExtraLoading(false);
            setLabelsLoading(false);
          }
        } else if (response.error) {
          toast.error(response.error);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        toast.error("An error occurred while loading the document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, token]);

  // Fetch metadata when metadata tab is selected
  useEffect(() => {
    if (activeTab === "metadata" && !metadataResponse && id && token) {
      handleExtractMetadata();
    }
    if (activeTab === "summary" && !summaryResponse && id && token) {
      handleGenerateSummary();
    }
    if (activeTab === "labels" && !labelsResponse && id && token) {
      handleGenerateLabels();
    }
    if (activeTab === "excel" && !excelMetadataResponse && id && token) {
      handleGetExcelMetadata();
    }
  }, [
    activeTab,
    id,
    token,
    metadataResponse,
    summaryResponse,
    labelsResponse,
    excelMetadataResponse,
  ]);

  const handleGenerateLabels = async () => {
    if (!id || !token) return;

    try {
      setLabelsLoading(true);
      const toastId = toast.loading("Generating labels...");

      const response = await generateDocumentLabels(id, token);
      if (response.data) {
        setLabelsResponse(response.data);
        toast.success("Labels generated successfully!");
      } else if (response.error) {
        toast.error(response.error);
      }

      toast.dismiss(toastId);
    } catch (error) {
      console.error("Error generating labels:", error);
      toast.error("Failed to generate labels");
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleExtractMetadata = async () => {
    if (!id || !token) return;

    try {
      setMetadataLoading(true);
      const toastId = toast.loading("Extracting metadata...");

      const response = await getDocumentMetadata(id, token, true); // include_cj_fallon=true
      if (response.data) {
        setMetadataResponse(response.data);
        toast.success("Metadata extracted successfully!");
      } else if (response.error) {
        toast.error(response.error);
      }

      toast.dismiss(toastId);
    } catch (error) {
      console.error("Error extracting metadata:", error);
      toast.error("Failed to extract metadata");
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!id || !token) return;

    try {
      setSummaryLoading(true);
      const toastId = toast.loading("Generating summary...");
      // const response = await summarizeDocument(id, token);
      // if (response.data) {
      //   setSummaryResponse(response.data);
      //   toast.success("Summary generated successfully!");
      // } else if (response.error) {
      //   toast.error(response.error);
      // }
      const lastUploadedId = localStorage.getItem("lastUploadedDocumentId");
      if (!lastUploadedId) {
        toast.error("No document ID found. Please upload a document first.");
        return;
      }

      let data = await IndexedDB.getById("documents", lastUploadedId);
      console.log("data.educational_metadata", data.educational_metadata);
      //   setDocumentData(data.educational_metadata);
      setSummaryResponse(data.educational_metadata);
      setSummaryLoading(false);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });

      toast.dismiss(toastId);
      toast.success("Summary generated successfully!");
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      toast.success("Summary generated successfully!");

      setSummaryLoading(false);
    }
  };

  // Map API response to document model
  const formatDocumentData = (data: any) => {
    // If we have a document from API

    if (data) {
      return {
        id: data.document_id || id,
        name: data.filename || "Untitled Document",
        type: data.mime_type ? data.mime_type.split("/")[1] : "unknown",
        uploadDate: data.created_at
          ? new Date(data.created_at).toLocaleDateString()
          : "Unknown",
        size: data.metadata?.attributes?.file_size
          ? `${(data.metadata?.attributes?.file_size / 1024).toFixed(2)} KB`
          : "Unknown size",
        pages: data.metadata?.page_count || 0,
        labels: data.labels || [],
        summary: data.metadata?.summary || "No summary available",
        metadata: {
          ...(data.metadata || {}),
          // Extract some specific metadata fields for display
          title: data.metadata?.document_title || data.filename || "Untitled",
          content_type: data.metadata?.content_type || "Unknown",
          word_count: data.metadata?.word_count || 0,
          char_count: data.metadata?.char_count || 0,
        },
        transcribe: data.content || "",
      };
    }

    // Fallback to mock data
    return {
      id,
      name: "Business Textbook Chapter 2.pdf",
      type: "pdf",
      uploadDate: "2023-05-10",
      size: "2.4 MB",
      pages: 15,
      labels: ["Business", "Textbook", "Chapter 2", "Economics", "Management"],
      summary:
        "This chapter covers the fundamental principles of business management including organizational structures, leadership styles, and decision-making processes.",
      metadata: {
        title: "21st Century Business (4th Edition)",
        author: "John Smith",
        publisher: "Academic Press",
        publishDate: "2022",
        isbn: "978-1234567890",
      },
    };
  };

  const handleGetExcelMetadata = async () => {
    if (!id || !token) return;

    try {
      setExcelMetadataLoading(true);
      const toastId = toast.loading("Fetching Detailed Information...");
      let data = localStorage.getItem("detailed");
      if (data) {
        setExcelMetadataResponse(JSON.parse(data));
      } else {
        const response = await getExcelMetadata(id, token);
        if (response.data) {
          response.data.rows = response.data.rows.map((row) => {
            // Remove unwanted fields
            const {
              Title,
              ["Grade(s)- ranges"]: _1,
              ["Standard"]: _2,
              ["Standard Description"]: _3,
              ["Standard ID"]: standardID,
              subject,
              ...filteredRow
            } = row;
            return filteredRow;
          });

          setExcelMetadataResponse(response.data);
          localStorage.setItem("detailed", JSON.stringify(response.data));
          toast.success("Detailed Information fetched successfully!");
        } else if (response.error) {
          toast.error(response.error);
        }
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });

      toast.dismiss(toastId);
      toast.success("Detailed Information fetched successfully!");
    } catch (error) {
      console.error("Error fetching Detailed Information:", error);
      toast.error("Failed to fetch Detailed Information");
    } finally {
      setExcelMetadataLoading(false);
    }
  };

  // If still loading or no document found, show loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading document...</p>
        </div>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const document = formatDocumentData(documentData);

  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("lastUploadedDocumentId");
            localStorage.removeItem("chapterLabels");
            localStorage.removeItem("detailed");
            localStorage.removeItem("documentInfo");

            navigate("/documents");
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground">
              The document you're looking for does not exist or you don't have
              access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <>{console.log("here")}</>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("lastUploadedDocumentId");
            localStorage.removeItem("chapterLabels");
            localStorage.removeItem("detailed");
            localStorage.removeItem("documentInfo");
            navigate("/documents");
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {documentData?.filename || "Untitled Document"}
            </h1>
            {/* <p className="text-muted-foreground">
              {document.uploadDate && `Uploaded on ${document.uploadDate}`}
              {document.size && ` • ${document.size}`}
              {document.pages && ` • ${document.pages} pages`}
            </p> */}
          </div>
          {/* <div className="flex gap-2">
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div> */}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {/* <TabsTrigger value="labels">Labels</TabsTrigger> */}
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          {/* <TabsTrigger value="excel">Detailed Information</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Image Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground">Filename</p>
                      <p className="font-medium">{documentData?.filename}</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{documentData?.mime_type}</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <p className="text-sm text-muted-foreground">Size</p>
                      <p className="font-medium">
                        {documentData?.metadata?.educational?.attributes?.file_size
                          ? `${(documentData.metadata?.educational?.attributes?.file_size / 1024).toFixed(
                              2
                            )} KB`
                          : "Unknown"}
                      </p>
                    </div>
                    {documentData?.image_features?.width ? (
                      <div className="border rounded-md p-3">
                        <p className="text-sm text-muted-foreground">
                          Dimensions
                        </p>
                        <p className="font-medium">
                          {documentData?.image_features?.width} x{" "}
                          {documentData?.image_features?.height}
                        </p>
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{documentData?.content}</p>
                </CardContent>
              </Card> */}
              {documentData?.educational_metadata ? (
                <>
                  {" "}
                  <Card>
                    <CardHeader>
                      <CardTitle>Educational Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {documentData?.educational_metadata?.title && (
                        <div className="border rounded-md p-3">
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-medium">
                            {documentData.educational_metadata.title}
                          </p>
                        </div>
                      )}

                      {documentData?.educational_metadata?.metadata
                        ?.grade_level && (
                        <div className="border rounded-md p-3">
                          <p className="text-sm text-muted-foreground">
                            Grade Level
                          </p>
                          <p className="font-medium">
                            {
                              documentData.educational_metadata.metadata
                                .grade_level
                            }
                          </p>
                        </div>
                      )}

                      {documentData?.educational_metadata?.metadata?.subject && (
                        <div className="border rounded-md p-3">
                          <p className="text-sm text-muted-foreground">
                            Subject
                          </p>
                          <p className="font-medium">
                            {documentData.educational_metadata.metadata.subject}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <></>
              )}
            </div>

            <div className="space-y-6 col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    {documentData?.educational_metadata?.summary ||
                      documentData?.metadata?.summary}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="labels" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Labels</CardTitle>
              <CardDescription>
                Labels and categories for this image
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labelsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, we are processing the labels...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Main Labels Section */}
                  {documentData?.metadata?.educational?.attributes?.labels?.labels &&
                    documentData?.metadata.educational.attributes.labels.labels.length > 0 && (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">
                            Primary Labels
                          </CardTitle>
                          <CardDescription>
                            Labels with confidence scores
                          </CardDescription>
                        </CardHeader>
                        <CardContent>

                      {typeof chapterLabelsResponse === 'object' && Object.keys(chapterLabelsResponse).length > 0 && (
                        <div className="mb-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {/* Iterate through chapters array */}
                            {chapterLabelsResponse.chapter_labels?.chapters.map((chapterData, chapterIndex) => (
                              <div
                                key={chapterIndex}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                              >
                                <h4 className="font-semibold text-md mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                                  {chapterData.chapter_title}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {/* Check if there are labels for this chapter */}
                                  {Array.isArray(chapterData.labels) && chapterData.labels.length > 0 ? (
                                    chapterData.labels.map((label, idx) => (
                                      <Badge
                                        key={idx}
                                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white border-0"
                                      >
                                        {typeof label === 'string' ? label : label.name || label.label || 'Unknown'}
                                      </Badge>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No labels available</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                        </CardContent>
                      </Card>
                    )}

                  {/* Metadata Labels Section */}
                  {/* {documentData?.labels?.metadata && (
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">
                          Metadata Categories
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {Object.entries(documentData.labels.metadata).map(
                            ([key, value]: [string, any]) => (
                              <div key={key} className="border rounded-md p-3">
                                <p className="capitalize">
                                  {key.replace(/_/g, " ")}
                                </p>
                                <p className="font-medium text-sm">
                                  {String(value)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )} */}

                  {/* Educational Labels */}
                  {documentData?.educational_metadata?.metadata &&
                    Object.keys(documentData?.educational_metadata?.metadata).length > 0 && (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">
                            Educational Categories
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(documentData?.educational_metadata?.metadata)
                              .filter(
                                ([_, value]) =>
                                  value && typeof value === "string"
                              )
                              .map(([key, value]: [string, any]) => (
                                <div
                                  key={key}
                                  className="border rounded-md p-3"
                                >
                                  <p className="capitalize">
                                    {key.replace(/_/g, " ")}
                                  </p>
                                  <p className="font-medium text-sm">
                                    {String(value)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Document Themes */}
                  {documentData?.metadata?.document_themes &&
                    documentData.metadata.document_themes.length > 0 && (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">
                            Document Themes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {documentData.metadata.document_themes.map(
                              (theme: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-sm px-3 py-1"
                                >
                                  {theme}
                                </Badge>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
              <CardDescription>
                Key metadata information for this image
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Info Section */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">Document Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {metadataResponse?.educational?.attributes && (
                        <>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries({
                              title: metadataResponse.educational?.attributes?.document_title,
                              subject: metadataResponse.educational?.attributes?.subject,
                              grade_levels:
                                metadataResponse.educational?.attributes?.grade_levels,
                              language: metadataResponse.educational?.attributes?.language,
                              target_audience: metadataResponse.educational?.attributes?.target_audience,
                              domain: metadataResponse.educational?.attributes?.domain,
                              description: metadataResponse.educational?.attributes?.description,
                            })
                              .filter(([_, value]) => value != null && value !== "null" && value !== "Not applicable")
                              .map(([key, value]) => (
                                <div
                                  key={key}
                                  className="border rounded-md p-2"
                                >
                                  <p className="font-medium">
                                    {key
                                      .split("_")
                                      .map(
                                        (w) => w[0].toUpperCase() + w.slice(1)
                                      )
                                      .join(" ")}
                                  </p>
                                  <p className="font-medium text-sm text-gray-700">
                                    {String(value)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Image Features Section */}

                  {(metadataResponse?.educational?.attributes?.image_features || documentData?.image_features) && (
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">
                          Image Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="border rounded-md p-2">
                            <p className="font-medium">Dimensions</p>
                            <p className="font-medium text-sm text-gray-700">
                              {(metadataResponse?.educational?.attributes?.image_features?.width || documentData.image_features?.width)} x{" "}
                              {(metadataResponse?.educational?.attributes?.image_features?.height || documentData.image_features?.height)} px
                            </p>
                          </div>
                          <div className="border rounded-md p-2">
                            <p className="font-medium">Format</p>
                            <p className="font-medium text-sm text-gray-700">
                              {metadataResponse?.educational?.attributes?.image_features?.format || documentData.image_features?.format}
                            </p>
                          </div>
                          <div className="border rounded-md p-2">
                            <p className="font-medium">Mode</p>
                            <p className="font-medium text-sm text-gray-700">
                              {metadataResponse?.educational?.attributes?.image_features?.mode || documentData.image_features?.mode}
                            </p>
                          </div>
                          {(metadataResponse?.educational?.attributes?.image_features?.quality_metrics || documentData.image_features?.quality_metrics) && (
                            <div className="border rounded-md p-2">
                              <p className="font-medium">Quality</p>
                              <p className="font-medium text-sm text-gray-700">
                                Clarity:{" "}
                                {(
                                  (metadataResponse?.educational?.attributes?.image_features?.quality_metrics?.clarity_score || documentData.image_features?.quality_metrics?.clarity_score) * 100
                                ).toFixed(0)}
                                %, Contrast:{" "}
                                {(
                                  (metadataResponse?.educational?.attributes?.image_features?.quality_metrics?.contrast_score || documentData.image_features?.quality_metrics?.contrast_score) * 100
                                ).toFixed(0)}
                                %, Noise:{" "}
                                {(
                                  (metadataResponse?.educational?.attributes?.image_features?.quality_metrics?.noise_level || documentData.image_features?.quality_metrics?.noise_level) * 100
                                ).toFixed(0)}
                                %
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* File Metadata Section */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">File Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="border rounded-md p-2">
                        <p className="font-medium">File Size</p>
                        <p className="font-medium text-sm text-gray-700">
                          {metadataResponse?.educational?.attributes?.file_size
                            ? `${(
                                metadataResponse.educational.attributes.file_size / 1024
                              ).toFixed(2)} KB`
                            : documentData?.metadata?.educational?.attributes?.file_size
                            ? `${(
                                documentData.metadata.educational.attributes.file_size / 1024
                              ).toFixed(2)} KB`
                            : "Unknown"}
                        </p>
                      </div>
                      <div className="border rounded-md p-2">
                        <p className="font-medium">MIME Type</p>
                        <p className="font-medium text-sm text-gray-700">
                          {metadataResponse?.educational?.attributes?.mime_type || documentData?.mime_type || "Unknown"}
                        </p>
                      </div>
                      <div className="border rounded-md p-2">
                        <p className="font-medium">Created At</p>
                        <p className="font-medium text-sm text-gray-700">
                          {metadataResponse?.educational?.attributes?.created_at
                            ? new Date(metadataResponse.educational.attributes.created_at).toLocaleString()
                            : documentData?.created_at
                            ? new Date(documentData.created_at).toLocaleString()
                            : "Unknown"}
                        </p>
                      </div>
                      {metadataResponse?.educational?.attributes?.char_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Character Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {metadataResponse.educational.attributes.char_count}
                          </p>
                        </div>
                      ) : documentData?.metadata?.char_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Character Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {documentData.metadata.char_count}
                          </p>
                        </div>
                      ) : (
                        <></>
                      )}
                      {metadataResponse?.educational?.attributes?.word_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Word Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {metadataResponse.educational.attributes.word_count}
                          </p>
                        </div>
                      ) : documentData?.metadata?.word_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Word Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {documentData.metadata.word_count}
                          </p>
                        </div>
                      ) : (
                        <></>
                      )}
                      {metadataResponse?.educational?.attributes?.line_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Line Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {metadataResponse.educational.attributes.line_count}
                          </p>
                        </div>
                      ) : documentData?.metadata?.line_count ? (
                        <div className="border rounded-md p-2">
                          <p className="font-medium">Line Count</p>
                          <p className="font-medium text-sm text-gray-700">
                            {documentData.metadata.line_count}
                          </p>
                        </div>
                      ) : (
                        <></>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Domain Information */}
                {(metadataResponse?.educational?.attributes?.domain || documentData?.metadata?.domain) && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">
                        Domain Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-2 mb-4">
                        <p className="font-medium">Domain</p>
                        <p className="font-medium text-sm text-gray-700">
                          {metadataResponse?.educational?.attributes?.domain || documentData.metadata.domain}
                        </p>
                      </div>
                      {(metadataResponse?.educational?.attributes?.domain_metadata?.domain_elements || documentData.metadata?.domain_metadata?.domain_elements) && (
                          <div className="border rounded-md p-2">
                            <p className="font-medium text-sm text-gray-700">Domain Elements</p>

                            <ul
                              className="ms-5"
                              style={{ listStyleType: "disc" }}
                            >
                              {Object.entries(
                                metadataResponse?.educational?.attributes?.domain_metadata?.domain_elements || documentData.metadata?.domain_metadata?.domain_elements
                              )
                                .filter(
                                  ([key, values]: [string, string[]]) =>
                                    values.length
                                )
                                .map(([key, values]: [string, string[]]) => (
                                  <li>
                                    <p className="font-medium text-sm text-gray-700">
                                      {key}
                                    </p>
                                    {values.join(", ")}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Summary</CardTitle>
              <CardDescription>
                AI-generated summary and educational content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, generating summary...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Main Summary */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">Content Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {documentData?.educational_metadata?.summary ||
                          documentData?.metadata?.summary ||
                          "No summary available"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Resource Summary */}
                  {documentData?.educational_metadata && (
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">
                          Resource Summary
                        </CardTitle>
                        {documentData?.educational_metadata?.title && (
                          <CardDescription>
                            {documentData?.educational_metadata?.title}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Summary Text */}
                        {documentData?.educational_metadata?.content_summary && (
                          <div className="border rounded-md p-3">
                            <p className="text-sm">
                              {summaryResponse.sections?.length &&
                              summaryResponse.sections.find(
                                (s) => s.heading == "Learning Objectives"
                              )
                                ? summaryResponse.sections
                                    .find(
                                      (s) => s.heading == "Learning Objectives"
                                    )
                                    .content.replace(/\n/g, " ")
                                    .replace(/\*/g, " ")
                                : documentData.educational_metadata?.content_summary}
                            </p>
                          </div>
                        )}

                        {/* Educational Sections */}
                        {documentData.educational_metadata?.document_sections &&
                          documentData.educational_metadata?.document_sections.length >
                            0 && (
                            <div className="space-y-4">
                              {documentData.educational_metadata.document_sections.map(
                                (section: any, index: number) => (
                                  <div
                                    key={index}
                                    className="border rounded-md p-3"
                                  >
                                    <h4 className="font-medium text-sm mb-2">
                                      {section.heading}
                                    </h4>
                                    <p className="text-sm whitespace-pre-line">
                                      {section.content_summary}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Learning Objectives */}
                  {documentData?.educational_metadata?.extended?.objectives &&
                    documentData.educational_metadata.extended.objectives.length > 0 && (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">
                            Learning Objectives
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-2 pl-2">
                            {documentData.educational_metadata.extended.objectives.map(
                              (objective: string, index: number) => (
                                <li key={index} className="text-sm">
                                  {objective}
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                  {/* Lessons */}
                  {documentData?.educational_metadata?.extended?.lessons &&
                    documentData.educational_metadata.extended.lessons.length > 0 && (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">Key Lessons</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-2 pl-2">
                            {documentData.educational_metadata.extended.lessons.map(
                              (lesson: string, index: number) => (
                                <li key={index} className="text-sm">
                                  {lesson}
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excel" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
              <CardDescription>
                Detailed informational metadata obtained from the document
                content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {excelMetadataLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, we are processing this API...
                    </p>
                  </div>
                </div>
              ) : excelMetadataResponse ? (
                <div className="space-y-6">
                  <div className="border rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium mb-2">
                      Document Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Title</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.filename}
                        </p>
                      </div>
                      {excelMetadataResponse.document_info.grade ? (
                        <div>
                          <p className="font-medium">Grade</p>
                          <p className="font-medium text-sm text-gray-700">
                            {excelMetadataResponse.document_info.grade}
                          </p>
                        </div>
                      ) : (
                        <></>
                      )}

                      <div>
                        <p className="font-medium">Author</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.author}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Target Audience</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.target_audience}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Subject</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.subject}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Language</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.language}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Publisher</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.publisher}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Publication Date</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.publication_date}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Learning Objectives</p>
                        <p className="font-medium text-sm text-gray-700">
                          {
                            excelMetadataResponse.document_info
                              .learning_objectives
                          }
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Summary</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.summary}
                        </p>
                      </div>
                    </div>

                    {excelMetadataResponse.original_metadata && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm border-t pt-3">
                        <div>
                          <span className="text-muted-foreground">
                            File Size:
                          </span>
                          <p className="font-medium">
                            {(
                              excelMetadataResponse.original_metadata
                                .file_size /
                              (1024 * 1024)
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pages:</span>
                          <p className="font-medium">
                            {excelMetadataResponse.original_metadata
                              .page_count || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Has Standards:
                          </span>
                          <p className="font-medium">
                            {excelMetadataResponse.original_metadata
                              .has_standards
                              ? "Yes"
                              : "No"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {excelMetadataResponse.rows &&
                    excelMetadataResponse.rows.length > 0 && (
                      <div className="border rounded-md p-4 mb-6">
                        <h3 className="text-lg font-medium mb-2">
                          Excel Data Rows ({excelMetadataResponse.rows.length})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                {Object.keys(excelMetadataResponse.rows[0]).map(
                                  (key, index) => (
                                    <th
                                      key={index}
                                      className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium"
                                    >
                                      {key}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {excelMetadataResponse.rows.map(
                                (row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className={
                                      rowIndex % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-50 dark:bg-gray-800"
                                    }
                                  >
                                    {Object.values(row).map(
                                      (value: any, valueIndex) => (
                                        <td
                                          key={valueIndex}
                                          className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm"
                                        >
                                          {typeof value === "string"
                                            ? value
                                            : String(value)}
                                        </td>
                                      )
                                    )}
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                        {excelMetadataResponse.rows.length > 5 && (
                          <div className="mt-2 text-center text-sm text-muted-foreground">
                            Showing {excelMetadataResponse.rows.length} rows
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium mb-2">
                      Detailed Information
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      It provides document information in a format compatible
                      with Microsoft Excel. This includes structured data about
                      the document content, such as learning objectives,
                      standards alignment, and organizational structure.
                    </p>
                    <Button onClick={handleGetExcelMetadata}>
                      Fetch Detailed Information
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageDetail;
