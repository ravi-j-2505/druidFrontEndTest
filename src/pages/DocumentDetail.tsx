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
import { Switch } from "@/components/ui/switch";

const DocumentDetail = () => {
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
  const [generatedSummary, setGeneratedSummary] = useState<any>(false);
  const [excelMetadataResponse, setExcelMetadataResponse] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [excelMetadataLoading, setExcelMetadataLoading] = useState(false);
  const [documentInfo, setDocumentInfo] = useState<any>(false);
  const [extraLoading, setExtraLoading] = useState<any>(false);

  const [summaryLevel, setSummaryLevel] = useState<any>("ultra_short");
  const [maxLength, setMaxLength] = useState(100);
  const [temperature, setTemperature] = useState(0.7);
  const [topp, setTopp] = useState(0.9);
  const [topk, setTopk] = useState(50);
  const [byChapter, setByChapter] = useState(true);

  const searchTerms =
    documentData?.educational_metadata?.search_terms ??
    documentData?.metadata?.search_terms ??
    [];

  const extendedMetadata =
    metadataResponse?.educational?.attributes?.extended ??
    documentData?.metadata?.extended ?? []

  const metadataLessons = documentData?.metadata?.educational?.attributes
    ?.detailed_lessons ?? documentData?.metadata?.detailed_lessons ?? []

  const metadataObjectives = documentData?.metadata?.educational?.attributes
    ?.objectives ?? documentData?.metadata?.objectives ?? []

  const metadataFontStats = documentData?.metadata?.educational?.attributes?.extended?.document_structure?.fonts ?? documentData?.metadata?.extended?.document_structure?.fonts ?? []

  const metadataDomains = documentData?.educational_metadata
    ?.domain_metadata ?? documentData?.metadata
      ?.domain_metadata ?? []


  const metadataStandardsAlignments = documentData?.educational_metadata
    ?.standards_alignments ?? documentData?.metadata
      ?.standards_alignments ?? []

  const summaryMetadata = documentData?.metadata ?? documentData?.educational_metadata ?? []

  const contentSummaryData = documentData?.summary?.summary ?? documentData?.metadata?.summary?? ""
  const docMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    "application/vnd.ms-word.document.macroEnabled.12",
  ];

  // Load document data on component mount
  useEffect(() => {
    const fetchDocument = async () => {
      if (!id || !token) return;

      setLoading(true);
      try {
        const response = await getDocument(id, token);
        if (response.data) {
          setDocumentData(response.data);
          setDocumentInfo(response.data);

          // Set chapter labels if available
          if (response.data.labels) {
            setChapterLabelsResponse(response.data.labels);
          } else {
            // Generate chapter labels if not available
            setLabelsLoading(true);
            setExtraLoading(true);

            try {
              const labelResponse = await generateDocumentLabels(id, token);
              if (labelResponse.data) {
                const labelResponseV2: any = await generateDocumentLabels(
                  id,
                  token
                );
                const chapterLabels =
                  labelResponseV2.data.labels?.chapter_labels?.chapter_labels ||
                  labelResponseV2.data.chapter_labels?.chapter_labels ||
                  labelResponseV2.data.chapter_labels ||
                  labelResponseV2.data;
                setChapterLabelsResponse(chapterLabels);

              }
            } catch (error) {
              console.error("Error generating chapter labels:", error);
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
      if (documentData?.mime_type?.startsWith("image/")) {
        setSummaryResponse({ summary: documentData.document_info?.summary });
      } else if (documentData?.educational_summary) {
        setSummaryResponse(documentData.educational_summary);
      }
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
    documentData,
  ]);

  const handleGenerateLabels = async () => {
    if (!id || !token) return;

    try {
      setLabelsLoading(true);
      const toastId = toast.loading("Generating labels...");

      const response = await generateDocumentLabels(id, token);
      if (response.data) {
        // Handle the nested structure properly
        const chapterLabels =
          response.data.labels?.chapter_labels?.chapter_labels ||
          response.data.chapter_labels?.chapter_labels ||
          response.data.chapter_labels ||
          response.data;

        setChapterLabelsResponse(chapterLabels);
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

  const [enableSummaryConfig, setEnableSummaryConfig] =
    useState<boolean>(false);

  const handleGenerateSummary = async () => {
    if (!id || !token) return;

    try {
      setSummaryLoading(true);
      const toastId = toast.loading("Generating summary...");

      const response = await summarizeDocument(
        id,
        token,
        summaryLevel,
        maxLength,
        true,
        temperature,
        topp,
        topk,
        byChapter
      );
      if (response.data) {
        if (byChapter && response.data.chapter_summaries) {
          const sections = [];

          for (const chapter in response.data.chapter_summaries) {
            sections.push({
              heading: chapter,
              content: response.data.chapter_summaries[chapter],
            });
          }
          setGeneratedSummary(true);
          setSummaryResponse({
            ...response.data,
            sections,
            metadata: response.data.metadata,
          });
          console.log("here");
        } else {
          setGeneratedSummary(true);

          setSummaryResponse({
            ...response.data,
            metadata: response.data.metadata,
          });
        }

        // if (response.data.document_info) {
        //   setDocumentInfo(response.data.document_info);
        // }
        toast.success("Summary generated successfully!");
      } else if (response.error) {
        toast.error(response.error);
      }

      setSummaryLoading(false);
      setEnableSummaryConfig(false);

      toast.dismiss(toastId);
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGetExcelMetadata = async () => {
    if (!id || !token) return;

    try {
      setExcelMetadataLoading(true);
      const toastId = toast.loading("Fetching Detailed Information...", {
        dismissible: true,
      });

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
        toast.success("Detailed Information fetched successfully!");
      } else if (response.error) {
        toast.error(response.error);
      }

      toast.dismiss(toastId);
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
          ? `${(data.metadata.attributes.file_size / 1024).toFixed(2)} KB`
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

  console.log(documentData.metadata, summaryMetadata?.document_sections, "=dsd===>")

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
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {!documentData.mime_type.startsWith("image/") && (
            <TabsTrigger value="labels">Labels</TabsTrigger>
          )}
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {!documentData.mime_type.startsWith("image/") && (
            <TabsTrigger value="excel">Detailed Information</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1  gap-6">
            {/* <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center border-t p-6">
                <div className="flex flex-col items-center text-muted-foreground">
                  <FileText className="w-24 h-24" />
                  <p className="mt-4">Preview not available</p>
                </div>
              </CardContent>
            </Card> */}
            {searchTerms.length > 0 && (
              <div className="space-y-12 col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {searchTerms.map(
                        (label: string, index: number) => (
                          <Badge key={index} className="text-sm px-3 py-1">
                            {label.replace("*", "")}
                          </Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent>
                {loading || !documentInfo ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Loading document information...
                      </p>
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-2">
                    <div>
                      <p className="font-medium">Title</p>
                      <p className="font-medium text-sm text-gray-700">
                        {
                          documentInfo?.metadata?.document_title ??
                          documentInfo?.educational_metadata?.document_title ??
                          documentInfo?.metadata?.educational?.attributes?.document_title ??
                          "-"
                        }
                      </p>
                    </div>
                    {documentInfo.metadata?.grade_levels && (
                      <div>
                        <p className="font-medium">Grade</p>
                        <p className="font-medium text-sm text-gray-700">
                          {documentInfo.metadata.grade_levels ?? "-"}
                        </p>
                      </div>
                    )}
                    {documentInfo.metadata?.author && (
                      <div>
                        <p className="font-medium">Author</p>
                        <p className="font-medium text-sm text-gray-700">
                          {documentInfo.metadata.author ?? "-"}
                        </p>
                      </div>
                    )}
                    {/* <div>
                    <p className="font-medium">
                      Target Audience
                    </p>
                    <p className="font-medium text-sm text-gray-700">
                      {documentInfo.target_audience ?? '-'}
                    </p>
                  </div> */}
                    <div>
                      <p className="font-medium">Subject</p>
                      <p className="font-medium text-sm text-gray-700">
                        {
                          documentInfo?.metadata?.educational?.attributes?.subject ??
                          documentInfo?.metadata?.subject_areas?.join(",") ??
                          "-"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Language</p>
                      <p className="font-medium text-sm text-gray-700">
                        {documentInfo?.educational_metadata?.language ?? documentInfo?.metadata?.language ?? "-"}
                      </p>
                    </div>
                    {documentInfo.metadata?.publisher && (
                      <div>
                        <p className="font-medium">Publisher</p>
                        <p className="font-medium text-sm text-gray-700">
                          {documentInfo.metadata.publisher ?? "-"}
                        </p>
                      </div>
                    )}
                    {documentInfo.metadata?.publication_date && (
                      <div>
                        <p className="font-medium">Publication Date</p>
                        <p className="font-medium text-sm text-gray-700">
                          {documentInfo.metadata.publication_date ?? "-"}
                        </p>
                      </div>
                    )}
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle>Detailed Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ms-5" style={{listStyleType:'disc'}}>
                  {documentData.metadata.detailed_lessons.map(lesson => (<li className="mb-4">
                    <h6 style={{fontWeight: 600}}>{lesson.title}</h6>
                    <p>{lesson.content}</p>
                  </li>))}
                </ul>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>

        <TabsContent value="labels" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Labels</CardTitle>
              <CardDescription>
                Labels automatically generated or manually added to this
                document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labelsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, we are processing this API...
                    </p>
                  </div>
                </div>
              ) : chapterLabelsResponse ? (
                <div className="space-y-6">
                  {/* Generated Labels Section */}
                  {labelsResponse && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Generated Labels
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {/* Extract labels from various possible structures */}
                        {(() => {
                          let generatedLabels = [];

                          if (
                            labelsResponse.labels?.chapter_labels
                              ?.chapter_labels
                          ) {
                            generatedLabels =
                              labelsResponse.labels.chapter_labels
                                .chapter_labels;
                          } else if (
                            labelsResponse.chapter_labels?.chapter_labels
                          ) {
                            generatedLabels =
                              labelsResponse.chapter_labels.chapter_labels;
                          } else if (
                            labelsResponse.labels &&
                            Array.isArray(labelsResponse.labels)
                          ) {
                            generatedLabels = labelsResponse.labels;
                          } else if (labelsResponse.generated_labels) {
                            generatedLabels = labelsResponse.generated_labels;
                          }

                          if (
                            Array.isArray(generatedLabels) &&
                            generatedLabels.length > 0
                          ) {
                            return generatedLabels.map(
                              (label: any, index: number) => (
                                <Badge
                                  key={index}
                                  className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white border-0"
                                >
                                  {typeof label === "string"
                                    ? label
                                    : label.name || label.label || "Unknown"}
                                </Badge>
                              )
                            );
                          }

                          if (
                            typeof chapterLabelsResponse === "object" &&
                            chapterLabelsResponse
                          ) {
                            const allLabels = new Set();
                            Object.values(chapterLabelsResponse).forEach(
                              (labels: any) => {
                                if (Array.isArray(labels)) {
                                  labels.forEach((label: any) => {
                                    if (typeof label === "string") {
                                      allLabels.add(label);
                                    } else if (label.name) {
                                      allLabels.add(label.name);
                                    }
                                  });
                                }
                              }
                            );

                            return Array.from(allLabels).map(
                              (label: any, index: number) => (
                                <Badge
                                  key={index}
                                  className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white border-0"
                                >
                                  {label}
                                </Badge>
                              )
                            );
                          }

                          return (
                            <p className="text-sm text-muted-foreground">
                              No generated labels available
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Topic Labels Section */}
                  {typeof chapterLabelsResponse === "object" &&
                    Object.keys(chapterLabelsResponse).length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">
                          Topic Labels
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(chapterLabelsResponse).map(
                            (
                              [chapter, labels]: [string, any],
                              chapterIndex: number
                            ) => (
                              <div
                                key={chapterIndex}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
                              >
                                <h4 className="font-semibold text-md mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                                  {chapter}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {Array.isArray(labels) ? (
                                    labels.map((label: any, idx: number) => (
                                      <Badge
                                        key={idx}
                                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white border-0"
                                      >
                                        {typeof label === "string"
                                          ? label
                                          : label.name ||
                                          label.label ||
                                          "Unknown"}
                                      </Badge>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      No labels available
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No labels available</p>
                  <Button onClick={handleGenerateLabels} className="mt-4">
                    Generate Labels
                  </Button>
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
                Extracted and enhanced metadata for this document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metadataLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Please wait, we are processing this API...
                      </p>
                    </div>
                  </div>
                ) : metadataResponse ? (
                  <div className="space-y-6">
                    <div className="border rounded-md p-4 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                          Metadata Overview
                        </h3>
                        {metadataResponse.s3_paths?.length > 0 && (
                          <div className="flex space-x-2">
                            {Object.entries(metadataResponse.s3_paths).map(
                              ([key, path]) => (
                                <Button
                                  key={key}
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      `/api/v1/download?path=${encodeURIComponent(
                                        path as string
                                      )}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download {key}
                                </Button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                Metadata Tag
                              </th>
                              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Define the basic metadata fields we want to show for documents
                              const basicDocumentMetadata = [
                                {
                                  key: "grade_levels",
                                  label: "Grade Levels",
                                  value: (() => {
                                    const gradeLevels =
                                      documentData?.metadata?.grade_levels ??
                                      documentData?.metadata?.educational?.attributes?.grade_levels ??
                                      documentInfo?.grade_levels;

                                    if (Array.isArray(gradeLevels) && gradeLevels.length > 0) {
                                      return gradeLevels.join(", ");
                                    }

                                    if (typeof gradeLevels === "string" && gradeLevels.trim().length > 0) {
                                      return gradeLevels;
                                    }

                                    return "Unknown";
                                  })(),
                                },
                                {
                                  key: "title",
                                  label: "Title",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.document_title ||
                                    documentData?.metadata?.document_title ||
                                    documentData?.filename ||
                                    "Unknown",
                                },
                                {
                                  key: "target_audience",
                                  label: "Target Audience",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.target_audience ||
                                    documentData?.metadata?.target_audience?.join(" ,") ||
                                    documentInfo?.target_audience ||
                                    "Unknown",
                                },
                                {
                                  key: "subject",
                                  label: "Subject",
                                  value:
                                    documentData?.metadata?.subject_areas?.join(
                                      ", "
                                    ) ||
                                    documentData?.metadata?.educational
                                      ?.attributes?.subject ||
                                    "Unknown",
                                },
                                {
                                  key: "language",
                                  label: "Language",
                                  value:
                                    documentData?.educational_metadata
                                      ?.language ||
                                    documentInfo?.language ||
                                    "Unknown",
                                },
                                {
                                  key: "number_of_chapters",
                                  label: "Number Of Chapters",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.number_of_chapters ||
                                    documentData?.metadata?.number_of_chapters
                                    ||
                                    "Unknown",
                                },
                                {
                                  key: "number_of_pages",
                                  label: "Number Of Pages",
                                  value:
                                    documentData?.metadata?.page_count ||
                                    documentData?.metadata?.educational
                                      ?.attributes?.page_count ||
                                    "Unknown",
                                },
                                {
                                  key: "book_series",
                                  label: "Book Series",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.book_series ||
                                    documentData?.metadata?.book_series ||
                                    "Unknown",
                                },
                                {
                                  key: "educational_themes",
                                  label: "Educational Themes",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.educational_themes ||
                                    documentData?.metadata?.educational_themes ||
                                    "Unknown",
                                },
                                {
                                  key: "age_level",
                                  label: "Age Level",
                                  value:
                                    documentData?.metadata?.educational
                                      ?.attributes?.age_level ||
                                    documentData?.metadata?.age_level || "Unknown",
                                },
                              ];

                              return basicDocumentMetadata
                                .filter((item) => {
                                  // if (item.key === 'number_of_chapters' || item.key === 'book_series') {
                                  //   return true;
                                  // }
                                  return (
                                    item.value &&
                                    item.value !== "Unknown" &&
                                    item.value !== "null"
                                  );
                                })
                                .map((item, index) => (
                                  <tr
                                    key={item.key}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-50 dark:bg-gray-800"
                                    }
                                  >
                                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">
                                      {item.label}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                      {item.value}
                                    </td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {/* <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                Property
                              </th>
                              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(metadataResponse)
                              .filter(
                                ([key, value]) =>
                                  value !== null &&
                                  ![
                                    "content_categories",
                                    "rule_matches",
                                    "extended",
                                  ].includes(key)
                              )
                              .map(([key, value], index) => (
                                <tr
                                  key={key}
                                  className={
                                    index % 2 === 0
                                      ? "bg-white dark:bg-gray-900"
                                      : "bg-gray-50 dark:bg-gray-800"
                                  }
                                >
                                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">
                                    {key}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                    {typeof value === "object"
                                      ? value === null
                                        ? "null"
                                        : JSON.stringify(value).substring(
                                            0,
                                            100
                                          ) +
                                          (JSON.stringify(value).length > 100
                                            ? "..."
                                            : "")
                                      : String(value)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div> */}
                    </div>

                    {/* Content Categories Table */}
                    {/* {metadataResponse.content_categories && (
                      <div className="border rounded-md p-4 mb-6">
                        <h3 className="text-lg font-medium mb-4">
                          Content Categories
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                  Category Type
                                </th>
                                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                  Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(
                                metadataResponse.content_categories
                              ).map(([key, value], index) => (
                                <tr
                                  key={key}
                                  className={
                                    index % 2 === 0
                                      ? "bg-white dark:bg-gray-900"
                                      : "bg-gray-50 dark:bg-gray-800"
                                  }
                                >
                                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">
                                    {key}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                    {JSON.stringify(value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )} */}

                    {/* Rule Matches Table */}
                    {metadataResponse.rule_matches &&
                      metadataResponse.rule_matches.length > 0 && (
                        <div className="border rounded-md p-4 mb-6">
                          <h3 className="text-lg font-medium mb-4">
                            Rule Matches
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                    Index
                                  </th>
                                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                    Rule
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {metadataResponse.rule_matches.map(
                                  (rule: any, index: number) => (
                                    <tr
                                      key={index}
                                      className={
                                        index % 2 === 0
                                          ? "bg-white dark:bg-gray-900"
                                          : "bg-gray-50 dark:bg-gray-800"
                                      }
                                    >
                                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                        {index + 1}
                                      </td>
                                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                        {JSON.stringify(rule)}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    {/* Extended Metadata Section */}
                    {extendedMetadata && (
                      <div className="border rounded-md p-4 mb-6">
                        <h3 className="text-lg font-medium mb-4">
                          Extended Metadata
                        </h3>

                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList className="grid grid-cols-6 mb-4">
                            <TabsTrigger value="overview">
                              Overview
                            </TabsTrigger>
                            <TabsTrigger value="lessons">Lessons</TabsTrigger>
                            <TabsTrigger value="objectives">
                              Objectives
                            </TabsTrigger>

                            <TabsTrigger value="font">Font Stats</TabsTrigger>
                            <TabsTrigger value="domain">Domain</TabsTrigger>
                            <TabsTrigger value="alignment">
                              Alignment
                            </TabsTrigger>
                            {/* <TabsTrigger value="structure">
                              Document Structure
                            </TabsTrigger> */}
                          </TabsList>

                          {/* Overview Tab */}
                          <TabsContent value="overview">
                            <div className="overflow-x-auto">
                              {/* <table className="w-full border-collapse">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                  <tr>
                                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                      Property
                                    </th>
                                    <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                      Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const filteredEntries = Object.entries(
                                      extendedMetadata
                                    ).filter(
                                      ([key, value]) =>
                                        value !== null &&
                                        Object.keys(value).length > 0 &&
                                        ![
                                          "lessons",
                                          "objectives",
                                          "custom_labels",
                                          "font_statistics",
                                          "document_structure",
                                          "quality_metrics",
                                          "processing_info",
                                        ].includes(key)
                                    );

                                    console.log(extendedMetadata,"fid==>")

                                    if (filteredEntries.length === 0) {
                                      return (
                                        <tr>
                                          <td
                                            colSpan={2}
                                            className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-center text-muted-foreground"
                                          >
                                            No data founddd
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return filteredEntries.map(
                                      ([key, value], index) => (
                                        <tr
                                          key={key}
                                          className={
                                            index % 2 === 0
                                              ? "bg-white dark:bg-gray-900"
                                              : "bg-gray-50 dark:bg-gray-800"
                                          }
                                        >
                                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">
                                            {key
                                              .split("_")
                                              .map(
                                                (w) =>
                                                  w[0].toUpperCase() +
                                                  w.slice(1, w.length)
                                              )
                                              .join(" ")}
                                          </td>
                                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                            {typeof value === "object"
                                              ? JSON.stringify(value)
                                              : String(value)}
                                          </td>
                                        </tr>
                                      )
                                    );
                                  })()}
                                </tbody>
                              </table> */}

                              {summaryMetadata
                                ?.resource_overview ? (
                                <ul
                                  className="ms-5"
                                  style={{ listStyleType: "disc" }}
                                >
                                  <li className="mb-4">

                                    <p>{summaryMetadata
                                      ?.resource_overview}</p>
                                  </li>
                                </ul>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No overview data available</p>
                                </div>
                              )}

                            </div>
                          </TabsContent>

                          {/* Lessons Tab */}
                          <TabsContent value="lessons">
                            {/* {(metadataResponse.extended.lessons ?? metadataResponse.extended.document_structure.lessons) &&
                            (metadataResponse.extended.lessons ?? metadataResponse.extended.document_structure.lessons).length > 0 ? (
                              <div className="overflow-y-auto max-h-96">
                                <div className="grid grid-cols-1 gap-2">
                                  {(metadataResponse.extended.lessons ?? metadataResponse.extended.document_structure.lessons).map(
                                    (lesson, index) => (
                                      <div
                                        key={index}
                                        className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-slate-50 dark:bg-slate-800"
                                      >
                                        <p className="text-sm whitespace-pre-wrap">
                                          {lesson}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No lesson data available</p>
                              </div>
                            )} */}
                            {metadataLessons ? (
                              <ul
                                className="ms-5"
                                style={{ listStyleType: "disc" }}
                              >
                                {metadataLessons.map(
                                  (lesson, index) => (
                                    <li key={index} className="mb-4">
                                      <h6 style={{ fontWeight: 600 }}>
                                        {lesson.title}
                                      </h6>
                                      <p>{lesson.content}</p>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No lesson data available</p>
                              </div>
                            )}
                          </TabsContent>

                          {/* Objectives Tab */}
                          <TabsContent value="objectives">
                            {/* {(metadataResponse.extended.objectives ?? metadataResponse.extended.document_structure.objectives) &&
                            (metadataResponse.extended.objectives ?? metadataResponse.extended.document_structure.objectives).length > 0 ? (
                              <div className="overflow-y-auto max-h-96">
                                <div className="grid grid-cols-1 gap-2">
                                  {(metadataResponse.extended.objectives ?? metadataResponse.extended.document_structure.objectives).map(
                                    (objective, index) => (
                                      <div
                                        key={index}
                                        className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-slate-50 dark:bg-slate-800"
                                      >
                                        <p className="text-sm whitespace-pre-wrap">
                                          {objective}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No objectives data available</p>
                              </div>
                            )} */}
                            {metadataObjectives ? (
                              <ul
                                className="ms-5"
                                style={{ listStyleType: "disc" }}
                              >
                                {metadataObjectives.map(
                                  (lesson, index) => (
                                    <li key={index} className="mb-4">
                                      <p
                                        style={{
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {lesson}
                                      </p>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No objectives data available</p>
                              </div>
                            )}
                          </TabsContent>

                          {/* Font Statistics Tab */}
                          <TabsContent value="font">
                            {docMimeTypes.includes(documentData.mime_type) ===
                              false &&
                              metadataFontStats ? (
                              <div className="space-y-4">
                                <h4 className="font-medium">
                                  Font Size Distribution
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {Object.entries(
                                    metadataFontStats.reduce(
                                      (acc, curr) => {
                                        const key = curr.xref.toString();
                                        acc[key] = (acc[key] || 0) + 1;
                                        return acc;
                                      },
                                      {}
                                    ) as Record<string, number>
                                  ).map(([size, count], index) => (
                                    <div
                                      key={index}
                                      className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-slate-50 dark:bg-slate-800"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        Size {size}pt
                                      </p>
                                      <p className="text-lg font-semibold">
                                        {count}
                                      </p>
                                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 mt-2 rounded overflow-hidden">
                                        <div
                                          className="bg-blue-500 h-full rounded"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              (Number(count) /
                                                Math.max(
                                                  ...Object.values(
                                                    metadataFontStats.reduce(
                                                      (acc, curr) => {
                                                        const key =
                                                          curr.xref.toString();
                                                        acc[key] =
                                                          (acc[key] || 0) + 1;
                                                        return acc;
                                                      },
                                                      {}
                                                    )
                                                  ).map((v) => Number(v))
                                                )) *
                                              100
                                            )}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : docMimeTypes.includes(
                              documentData.mime_type
                            ) &&
                              metadataFontStats ? (
                              <div className="space-y-4">
                                <h4 className="font-medium">
                                  Font Family Distribution
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {Object.entries(
                                    metadataFontStats.font_counts
                                  ).map(([font, count], index) => (
                                    <div
                                      key={index}
                                      className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-slate-50 dark:bg-slate-800"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        {font}
                                      </p>
                                      <p className="text-lg font-semibold">
                                        {count as number}
                                      </p>
                                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 mt-2 rounded overflow-hidden">
                                        <div
                                          className="bg-blue-500 h-full rounded"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              (Number(count) /
                                                Math.max(
                                                  ...Object.values(
                                                    metadataFontStats.font_counts
                                                  ).map((v) => Number(v))
                                                )) *
                                              100
                                            )}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No font statistics available</p>
                              </div>
                            )}

                            {/* {metadataResponse.extended.font_statistics ? (
                              <div className="space-y-4">
                                <h4 className="font-medium">
                                  Font Size Distribution
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {Object.entries(
                                    metadataResponse.extended
                                      .font_statistics as Record<string, number>
                                  ).map(([size, count], index) => (
                                    <div
                                      key={index}
                                      className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-slate-50 dark:bg-slate-800"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        Size {size}pt
                                      </p>
                                      <p className="text-lg font-semibold">
                                        {count}
                                      </p>
                                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 mt-2 rounded overflow-hidden">
                                        <div
                                          className="bg-blue-500 h-full rounded"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              (Number(count) /
                                                Math.max(
                                                  ...Object.values(
                                                    metadataResponse.extended
                                                      .font_statistics
                                                  ).map((v) => Number(v))
                                                )) *
                                                100
                                            )}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No font statistics available</p>
                              </div>
                            )} */}
                          </TabsContent>

                          <TabsContent value="domain">
                            {metadataDomains ? (
                              <>
                                <h4
                                  className="mb-5"
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "20px",
                                  }}
                                >
                                  Domain:{" "}
                                  {
                                    metadataDomains.domain
                                  }
                                </h4>

                                {/* <ul
                                  className="ms-5"
                                  style={{ listStyleType: "disc" }}
                                >
                                  {typeof(metadataDomains
                                      .domain_elements) === "object" ? Object.keys(
                                    documentData.educational_metadata
                                      .domain_metadata.domain_elements
                                  ).map((ele) => (
                                    <li>
                                      <h6 style={{ fontWeight: 600 }}>
                                        {ele}
                                      </h6>
                                      <p>
                                        {typeof documentData?.metadata
                                          ?.domain_metadata?.domain_elements[
                                          ele
                                        ] === "string"
                                          ? documentData?.metadata
                                            ?.domain_metadata
                                            ?.domain_elements[ele]
                                          : documentData?.educational_metadata?.domain_metadata?.domain_elements[
                                            ele
                                          ].join(", ")}
                                      </p>
                                    </li>
                                  )): <li>{metadataDomains
                                      .domain_elements}</li>}
                                </ul> */}

                                <ul className="ms-5" style={{ listStyleType: "disc" }}>
                                  {(() => {


                                    // STRING → single li
                                    if (typeof metadataDomains?.domain_elements === "string") {
                                      return <li>{metadataDomains?.domain_elements}</li>;
                                    }

                                    // OBJECT or ARRAY
                                    if (typeof metadataDomains?.domain_elements === "object" && metadataDomains?.domain_elements !== null) {
                                      return Object.entries(metadataDomains?.domain_elements).map(([key, value]) => (
                                        <li key={key}>
                                          <h6 style={{ fontWeight: 600 }}>{key}</h6>

                                          {/* STRING */}
                                          {typeof value === "string" && <p>{value}</p>}

                                          {/* ARRAY */}
                                          {Array.isArray(value) && (
                                            <ul className="ms-5" style={{ listStyleType: "circle" }}>
                                              {value.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                              ))}
                                            </ul>
                                          )}

                                          {/* OBJECT */}
                                          {typeof value === "object" &&
                                            !Array.isArray(value) &&
                                            value !== null && (
                                              <ul className="ms-5" style={{ listStyleType: "circle" }}>
                                                {Object.entries(value).map(([k, v]) => (
                                                  <li key={k}>
                                                    <strong>{k}:</strong>{" "}
                                                    {Array.isArray(v) ? v.join(", ") : String(v)}
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                        </li>
                                      ));
                                    }

                                    return null;
                                  })()}
                                </ul>
                              </>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No domain metadata available</p>
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="alignment">
                            {metadataStandardsAlignments?.length > 0 ? (
                              <ul
                                className="ms-5"
                                style={{ listStyleType: "disc" }}
                              >
                                {metadataStandardsAlignments?.map(
                                  (ele) => (
                                    <li>
                                      <h6 style={{ fontWeight: 600 }}>
                                        {ele.subject}
                                      </h6>
                                      <p>{ele.description}</p>
                                      {ele.grade_levels?.length>0 && (
                                        <p>
                                          Grade Levels:{" "}
                                          {ele?.grade_levels?.join(", ") ??
                                            "-"}
                                        </p>
                                      )}
                                      {ele.code && <p>Code: {ele.code}</p>}
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No alignments data available</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}

                    {metadataResponse.custom_labels &&
                      metadataResponse.custom_labels.length > 0 && (
                        <div className="border rounded-md p-4 mb-6">
                          <h3 className="text-lg font-medium mb-4">
                            Custom Labels
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                    Label
                                  </th>
                                  {/* <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                    Confidence
                                  </th> */}
                                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-medium">
                                    Category
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {metadataResponse.custom_labels.map(
                                  (label: any, index: number) => (
                                    <tr
                                      key={index}
                                      className={
                                        index % 2 === 0
                                          ? "bg-white dark:bg-gray-900"
                                          : "bg-gray-50 dark:bg-gray-800"
                                      }
                                    >
                                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium">
                                        {label.label}
                                      </td>
                                      {/* <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm">
                                        {(label.confidence * 100).toFixed(0)}%
                                      </td> */}
                                      <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm capitalize">
                                        {label.category || "N/A"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">
                        Complete Metadata
                      </h3>
                      <ResponseDisplay
                        title="Complete Metadata"
                        description="Full extracted metadata from the document"
                        response={metadataResponse}
                        endpoint={`/api/v1/documents/${id}/metadata`}
                        method="GET"
                      />
                    </div> */}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {document.metadata &&
                        Object.entries(document.metadata).map(
                          ([key, value]) => (
                            <div key={key} className="border rounded-md p-3">
                              <p className="text-sm text-muted-foreground">
                                {key}
                              </p>
                              <p className="font-medium">{String(value)}</p>
                            </div>
                          )
                        )}
                    </div>

                    <div className="border rounded-md p-4 mt-6">
                      <h3 className="text-lg font-medium mb-2">
                        Extract Educational Metadata
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Extract advanced educational metadata including learning
                        objectives, grade levels, and more
                      </p>
                      <Button onClick={handleExtractMetadata}>
                        Extract Metadata
                      </Button>
                    </div>
                  </>
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
                AI-generated summary of the document content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!enableSummaryConfig &&
                !documentData.mime_type.startsWith("image/") && (
                  <button
                    type="button"
                    className="bg-primary px-5 py-2 rounded-md text-white mb-5"
                    disabled={summaryLoading}
                    onClick={() => setEnableSummaryConfig(true)}
                  >
                    Regenerate Summary
                  </button>
                )}

              {enableSummaryConfig && !summaryLoading && (
                <div className="border rounded-md p-4 mb-5">
                  <h3 className="text-lg font-medium mb-2">Generate Summary</h3>
                  {/* <p className="text-sm text-muted-foreground mb-4">
                  Create a new summary with different length and focus
                  options
                </p> */}
                  {/* <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleGenerateSummary}>
                    Generate Summary
                  </Button>
                </div> */}
                  <div className="mb-5 border rounded-md p-4">
                    <div className="grid grid-cols-2">
                      <div className="px-2 py-1">
                        <label htmlFor="summaryLevel" className="w-full">
                          Summary Level
                        </label>
                        <select
                          id="summaryLevel"
                          name="level"
                          className="border rounded-md p-2 w-full"
                          onChange={(evt) => setSummaryLevel(evt.target.value)}
                        >
                          <option value="ultra_short">ultra_short</option>
                          <option value="short">short</option>
                          <option value="medium">medium</option>
                          <option value="detailed">detailed</option>
                          <option value="comprehensive">comprehensive</option>
                        </select>
                      </div>
                      <div className="px-2 py-1">
                        <label htmlFor="maxLength" className="w-full">
                          Max Length
                        </label>
                        <input
                          id="maxLength"
                          type="number"
                          value={maxLength}
                          onChange={(evt) => setMaxLength(evt.target.value)}
                          className="border rounded-md py-2 px-3 w-full"
                        />
                      </div>
                      <div className="px-2 py-1">
                        <label htmlFor="temperature" className="w-full">
                          Temperature
                        </label>
                        <input
                          id="temperature"
                          type="number"
                          value={temperature}
                          onChange={(evt) => setTemperature(evt.target.value)}
                          className="border rounded-md py-2 px-3 w-full"
                        />
                      </div>
                      <div className="px-2 py-1">
                        <label htmlFor="top_p" className="w-full">
                          top_p
                        </label>
                        <input
                          id="top_p"
                          type="number"
                          value={topp}
                          onChange={(evt) => setTopp(evt.target.value)}
                          className="border rounded-md py-2 px-3 w-full"
                        />
                      </div>
                      <div className="px-2 py-1">
                        <label htmlFor="top_k" className="w-full">
                          top_k
                        </label>
                        <input
                          id="top_k"
                          type="number"
                          value={topk}
                          onChange={(evt) => setTopk(evt.target.value)}
                          className="border rounded-md py-2 px-3 w-full"
                        />
                      </div>
                      {/* <div
                        className="px-2 py-1 pt-8"
                        style={{ display: "flex" }}
                      >
                        <div
                          className="pe-4"
                          onClick={() => setByChapter(!byChapter)}
                        >
                          By Chapter
                        </div>
                        <Switch
                          checked={byChapter}
                          onClick={() => setByChapter(!byChapter)}
                        />
                      </div> */}
                    </div>

                    <div className="px-2 py-1">
                      <button
                        type="button"
                        className="bg-primary px-5 py-2 rounded-md text-white"
                        disabled={summaryLoading}
                        onClick={handleGenerateSummary}
                      >
                        Generate Summary
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <>{console.log("summaryResponse", summaryResponse)}</>
              {summaryLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, we are processing this API...
                    </p>
                  </div>
                </div>
              ) : documentData ? (
                <div className="space-y-6">
                  {generatedSummary ? (
                    <>
                      {/* Summary Metadata */}
                      {summaryMetadata && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                          <div>
                            <span className="text-muted-foreground">
                              Audience:
                            </span>
                            <p className="font-medium">
                              {summaryMetadata?.audience ||
                                "General"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Format:
                            </span>
                            <p className="font-medium capitalize">
                              {summaryMetadata?.format}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Subject:
                            </span>
                            <p className="font-medium">
                              {summaryMetadata?.subject ||
                                "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Grade Level:
                            </span>
                            <p className="font-medium">
                              {typeof summaryMetadata
                                ?.grade_levels === "string"
                                ? summaryMetadata
                                  ?.grade_levels
                                : summaryMetadata?.grade_levels?.join(
                                  ", "
                                )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Structured Summary Data */}
                      {summaryMetadata.summary && (
                        <div className="border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-3">
                            Resource Summary
                          </h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-line">
                              {summaryMetadata
                                ?.resource_overview ??
                                (summaryMetadata
                                  ?.document_sections?.length &&
                                  summaryMetadata?.document_sections.find(
                                    (s) => s.heading == "Learning Objectives"
                                  )
                                  ? summaryMetadata?.document_sections
                                    .find(
                                      (s) =>
                                        s.heading == "Learning Objectives"
                                    )
                                    .content.replace(/\n/g, " ")
                                    .replace(/\*/g, " ")
                                  : documentData?.content_summary)}
                            </p>
                          </div>
                        </div>
                      )}

                      {summaryResponse?.sections?.length > 0 && (
                        <div className="border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-3">
                            Structured Summary
                          </h3>
                          <div className="space-y-6">
                            {/* Objectives */}
                            {summaryResponse?.sections && (
                              <div>
                                <ul
                                  className="list-disc list-inside space-y-1 pl-2"
                                  style={{ listStyleType: "none" }}
                                >
                                  {summaryResponse?.sections.map(
                                    (item: any, index: number) => (
                                      <>
                                        <h4 className="font-medium text-md mb-2 flex items-center gap-2">
                                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                            {item.index}
                                          </div>
                                          {item.heading}
                                        </h4>
                                        <li key={index} className="text-sm">
                                          {item.content
                                            .replace(/\n/g, " ")
                                            .replace(/\*/g, " ")}
                                        </li>
                                      </>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                            {/*  */}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Summary Metadata */}
                      {summaryMetadata && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                          <div>
                            <span className="text-muted-foreground">
                              Audience:
                            </span>
                            <p className="font-medium">
                              {summaryMetadata?.audience ||
                                "General"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Format:
                            </span>
                            <p className="font-medium capitalize">
                              {summaryMetadata?.format}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Subject:
                            </span>
                            <p className="font-medium">
                              {summaryMetadata?.subject ||
                                "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Grade Level:
                            </span>
                            <p className="font-medium">
                              {typeof summaryMetadata
                                ?.grade_levels === "string"
                                ? summaryMetadata
                                  ?.grade_levels
                                : summaryMetadata?.grade_levels?.join(
                                  ", "
                                )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Summary Full Text */}
                      {summaryMetadata?.summary && (
                        <div className="border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-3">
                            Resource Summary
                          </h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-line">
                              {summaryMetadata
                                ?.resource_overview ??
                                (summaryMetadata
                                  ?.document_sections?.length &&
                                  summaryMetadata?.document_sections.find(
                                    (s) => s.heading == "Learning Objectives"
                                  )
                                  ? summaryMetadata?.document_sections
                                    .find(
                                      (s) =>
                                        s.heading == "Learning Objectives"
                                    )
                                    .content.replace(/\n/g, " ")
                                    .replace(/\*/g, " ")
                                  : documentData?.content_summary)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Summary Full Text */}
                      {contentSummaryData && (
                        <div className="border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-3">
                            Content Summary
                          </h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-line">
                              {contentSummaryData}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Structured Summary Data */}
                      {summaryMetadata?.document_sections?.length >0 && (
                          <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-3">
                              Structured Summarys
                            </h3>
                            <div className="space-y-6">
                              {/* Objectives */}
                              {summaryMetadata
                                ?.document_sections && (
                                  <div>
                                    <ul
                                      className="list-disc list-inside space-y-1 pl-2"
                                      style={{ listStyleType: "none" }}
                                    >
                                      {summaryMetadata?.document_sections.map(
                                        (item: any, index: number) => (
                                          <>
                                            <h4 className="font-medium text-md mb-2 flex items-center gap-2">
                                              <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                                {item.index}
                                              </div>
                                              {item.heading}
                                            </h4>
                                            <li key={index} className="text-sm">
                                              {item.content_summary
                                                .replace(/\n/g, " ")
                                                .replace(/\*/g, " ")}
                                            </li>
                                          </>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {/*  */}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              ) : (
                 <>
                  {/* <div className="border rounded-md p-4 mb-6">
                    <h3 className="text-lg font-medium mb-2">
                      Current Summary
                    </h3>
                    <p className="text-sm">{document.summary}</p>
                  </div> */}
 
                  {!enableSummaryConfig && (
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-2">
                        Generate Summary
                      </h3>
                      {/* <p className="text-sm text-muted-foreground mb-4">
                      Create a new summary with different length and focus
                      options
                    </p> */}
                      {/* <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={handleGenerateSummary}>
                        Generate Summary
                      </Button>
                    </div> */}
                      <div className="mb-5 border rounded-md p-4">
                        <div className="grid grid-cols-2">
                          <div className="px-2 py-1">
                            <label htmlFor="summaryLevel" className="w-full">
                              Summary Level
                            </label>
                            <select
                              id="summaryLevel"
                              name="level"
                              className="border rounded-md p-2 w-full"
                              onChange={(evt) =>
                                setSummaryLevel(evt.target.value)
                              }
                            >
                              <option value="ultra_short">ultra_short</option>
                              <option value="short">short</option>
                              <option value="medium">medium</option>
                              <option value="detailed">detailed</option>
                              <option value="comprehensive">
                                comprehensive
                              </option>
                            </select>
                          </div>
                          <div className="px-2 py-1">
                            <label htmlFor="maxLength" className="w-full">
                              Max Length
                            </label>
                            <input
                              id="maxLength"
                              type="number"
                              value={maxLength}
                              onChange={(evt) => setMaxLength(evt.target.value)}
                              className="border rounded-md py-2 px-3 w-full"
                            />
                          </div>
                          <div className="px-2 py-1">
                            <label htmlFor="temperature" className="w-full">
                              Temperature
                            </label>
                            <input
                              id="temperature"
                              type="number"
                              value={temperature}
                              onChange={(evt) =>
                                setTemperature(evt.target.value)
                              }
                              className="border rounded-md py-2 px-3 w-full"
                            />
                          </div>
                          <div className="px-2 py-1">
                            <label htmlFor="top_p" className="w-full">
                              top_p
                            </label>
                            <input
                              id="top_p"
                              type="number"
                              value={topp}
                              onChange={(evt) => setTopp(evt.target.value)}
                              className="border rounded-md py-2 px-3 w-full"
                            />
                          </div>
                          <div className="px-2 py-1">
                            <label htmlFor="top_k" className="w-full">
                              top_k
                            </label>
                            <input
                              id="top_k"
                              type="number"
                              value={topk}
                              onChange={(evt) => setTopk(evt.target.value)}
                              className="border rounded-md py-2 px-3 w-full"
                            />
                          </div>
                          <div
                            className="px-2 py-1 pt-8"
                            style={{ display: "flex" }}
                          >
                            <div
                              className="pe-4"
                              onClick={() => setByChapter(!byChapter)}
                            >
                              By Chapter
                            </div>
                            <Switch
                              checked={byChapter}
                              onClick={() => setByChapter(!byChapter)}
                            />
                          </div>
                        </div>
 
                        <div className="px-2 py-1">
                          <button
                            type="button"
                            className="bg-primary px-5 py-2 rounded-md text-white"
                            disabled={summaryLoading}
                            onClick={handleGenerateSummary}
                          >
                            Generate Summary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>

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
                        <p className="text-md font-medium">Title</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.filename ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-md font-medium">Grade</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.grade ?? "-"}
                        </p>
                      </div>
                      {excelMetadataResponse.document_info.author && (
                        <div>
                          <p className="text-md font-medium">Author</p>
                          <p className="font-medium text-sm text-gray-700">
                            {excelMetadataResponse.document_info.author ?? "-"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-md font-medium">Target Audience</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info
                            .target_audience ?? "-"}
                        </p>
                      </div>
                      <div></div>
                      <div>
                        <p className="text-md font-medium">Subject</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.subject ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-md font-medium">Language</p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.language ?? "-"}
                        </p>
                      </div>
                      {excelMetadataResponse.document_info.publisher && (
                        <div>
                          <p className="text-md font-medium">Publisher</p>
                          <p className="font-medium text-sm text-gray-700">
                            {excelMetadataResponse.document_info.publisher ??
                              "-"}
                          </p>
                        </div>
                      )}
                      {excelMetadataResponse.document_info.publication_date && (
                        <div>
                          <p className="text-md font-medium">
                            Publication Date
                          </p>
                          <p className="font-medium text-sm text-gray-700">
                            {excelMetadataResponse.document_info
                              .publication_date ?? "-"}
                          </p>
                        </div>
                      )}
                      {/* <div>
                        <p className="text-md font-medium">
                          Learning Objectives
                        </p>
                        <p className="font-medium text-sm text-gray-700">
                          {
                            excelMetadataResponse.document_info
                              .learning_objectives ?? '-'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-md font-medium">
                          Summary
                        </p>
                        <p className="font-medium text-sm text-gray-700">
                          {excelMetadataResponse.document_info.summary ?? '-'}
                        </p>
                      </div> */}
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

                  {excelMetadataResponse?.rows?.length > 0 && (
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

                  {/* <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">
                      Complete Excel Metadata
                    </h3>
                    <ResponseDisplay
                      title="Excel Metadata Details"
                      description="Complete Excel-compatible metadata"
                      response={excelMetadataResponse}
                      endpoint={`/api/v1/documents/${id}/excel-metadata`}
                      method="GET"
                    />
                  </div> */}
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

export default DocumentDetail;
