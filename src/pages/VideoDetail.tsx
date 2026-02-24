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

const VideoDetail = () => {
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

          // Set document info from the new response structure
          setDocumentInfo({
            title: document.filename,
            mime_type: document.mime_type,
            file_size: document.metadata?.file_size,
          });

          setSummaryResponse({
            summary: document?.educational_metadata?.summary,
            sections: document?.educational_metadata?.document_sections,
          });

          setLabelsResponse(document.labels || {});

          // Set chapter labels if available
          if (document.labels) {
            setChapterLabelsResponse(document.labels);
          } else {
            // Generate chapter labels if not available
            setLabelsLoading(true);
            setExtraLoading(true);

            try {
              const labelResponse = await generateDocumentLabels(id, token);
              if (labelResponse.data) {
                if (labelResponse.data) {
                  const labelResponseV2: any = await generateDocumentLabels(
                    id,
                    token
                  );

                  const chapterLabels =
                    labelResponseV2.data.labels?.chapter_labels
                      ?.chapter_labels ||
                    labelResponseV2.data.chapter_labels?.chapter_labels ||
                    labelResponseV2.data.chapter_labels ||
                    labelResponseV2.data;
                  setChapterLabelsResponse(chapterLabels);
                }
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
      handleGenerateSummary();
    }
    if (
      activeTab === "labels" &&
      (!chapterLabelsResponse ||
        Object.keys(chapterLabelsResponse).length === 0) &&
      id &&
      token
    ) {
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
        // Extract chapter labels from the response structure
        const chapterLabels =
          response.data.labels?.chapter_labels?.chapter_labels || {};
        setChapterLabelsResponse(chapterLabels);
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

      let lastUploadedId = localStorage.getItem("lastUploadedDocumentId");
      if (!lastUploadedId || lastUploadedId == "undefined") {
        if (!id) {
          toast.error("No document ID found. Please upload a document first.");
          return;
        } else {
          lastUploadedId = id;
        }
      }

      // For now, use the current document data instead of IndexedDB
      let data = documentData;
      //   setDocumentData(data.educational_summary);
      setSummaryResponse(data.educational_summary);
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
        size: data.metadata?.file_size
          ? `${(data.metadata.file_size / 1024).toFixed(2)} KB`
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
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          {/* <TabsTrigger value="excel">Detailed Information</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {documentData.search_terms?.length && (
              <div className="space-y-12 col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {documentData.search_terms.map(
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
            <div className="space-y-12 col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Transcribe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <p>{documentData?.content || "No transcription available"}</p>
                </CardContent>
              </Card>
            </div>
            {/* <div className="space-y-6 col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <Button
                    onClick={handleGenerateLabels}
                    className="w-full"
                    disabled={labelsLoading}
                  >
                    {labelsLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Tag className="h-4 w-4 mr-2" />
                        Generate Labels
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleExtractMetadata}
                    className="w-full"
                    disabled={metadataLoading}
                  >
                    {metadataLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                        Processing...
                      </>
                    ) : (
                      "Extract Metadata"
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateSummary}
                    className="w-full"
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                        Processing...
                      </>
                    ) : (
                      "Create Summary"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div> */}
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
              ) : chapterLabelsResponse || labelsResponse ? (
                <div className="space-y-4">
                  {labelsResponse && labelsResponse.labels && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">
                        Generated Labels
                      </h3>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {(() => {
                          const allLabels = [];
                          if (
                            labelsResponse.labels.chapter_labels?.chapter_labels
                          ) {
                            Object.values(
                              labelsResponse.labels.chapter_labels
                                .chapter_labels
                            ).forEach((chapterLabels: any) => {
                              if (Array.isArray(chapterLabels)) {
                                allLabels.push(...chapterLabels);
                              }
                            });
                          }
                          return allLabels.map((label: any, index: number) => (
                            <Badge
                              key={index}
                              className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white border-0"
                            >
                              {typeof label === "string"
                                ? label
                                : label.name || label.label || "Unknown"}
                            </Badge>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  {extraLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-sm text-muted-foreground">
                          Please wait, we are processing this fetching the
                          subject labels...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {chapterLabelsResponse && (
                        <div className="mb-8">
                          <h3 className="text-lg font-medium mb-4">
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
                                  className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 hover:shadow-md transition-shadow"
                                >
                                  <h4 className="font-semibold text-md mb-3 border-b pb-2">
                                    {chapter}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {Array.isArray(labels) &&
                                      labels.map((label: any, idx: number) => (
                                        <Badge
                                          key={idx}
                                          className="px-2 py-1 text-xs"
                                          variant={"default"}
                                        >
                                          {label.name}
                                        </Badge>
                                      ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* <div className="flex flex-wrap gap-2 mb-6">
                    {document.labels.labels &&
                      document.labels.labels.map(
                        (label: string, index: number) => (
                          <Badge key={index} className="text-sm px-3 py-1">
                            {label.name}
                          </Badge>
                        )
                      )}
                  </div> */}

                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">
                      Generate New Labels
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate automatic labels for this document based on its
                      content
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleGenerateLabels}>
                        Generate Labels
                      </Button>
                    </div>
                  </div>
                </>
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
                        {metadataResponse.s3_paths &&
                          metadataResponse.s3_paths.length && (
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
                              const basicVideoMetadata = [
                                {
                                  key: "title",
                                  label: "Title",
                                  value: documentData?.filename || "Unknown",
                                },
                                {
                                  key: "mime_type",
                                  label: "Mime Type",
                                  value: documentData?.mime_type || "Unknown",
                                },
                                {
                                  key: "duration_seconds",
                                  label: "Duration Seconds",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.duration_seconds || "0",
                                },
                                {
                                  key: "size_bytes",
                                  label: "Size Bytes",
                                  value: documentData?.educational_metadata
                                    ?.file_size
                                    ? `${(
                                        documentData.educational_metadata
                                          .file_size /
                                        (1024 * 1024)
                                      ).toFixed(2)} MB`
                                    : "Unknown",
                                },
                                {
                                  key: "bit_rate",
                                  label: "Bit Rate",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.bit_rate || "Unknown",
                                },
                                {
                                  key: "width",
                                  label: "Width",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.width || "Unknown",
                                },
                                {
                                  key: "height",
                                  label: "Height",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.height || "Unknown",
                                },
                                {
                                  key: "video_codec",
                                  label: "Video Codec",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.video_codec || "Unknown",
                                },
                                {
                                  key: "audio_codec",
                                  label: "Audio Codec",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.audio_codec || "Unknown",
                                },
                                {
                                  key: "audio_sample_rate",
                                  label: "Audio Sample Rate",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.audio_sample_rate || "Unknown",
                                },
                                {
                                  key: "audio_channels",
                                  label: "Audio Channels",
                                  value:
                                    metadataResponse?.educational?.attributes
                                      ?.audio_channels || "Unknown",
                                },
                              ];

                              return basicVideoMetadata.map((item, index) => (
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
                    </div>

                    {/* Rule Matches Table */}
                    {metadataResponse.educational.attributes.rule_matches &&
                      metadataResponse.educational.attributes.rule_matches
                        .length > 0 && (
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
                                {metadataResponse.educational.attributes.rule_matches.map(
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

                    {!metadataResponse.educational.attributes.custom_labels &&
                      metadataResponse.educational.attributes.custom_labels
                        .length > 0 && (
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
                                {metadataResponse.educational.attributes.custom_labels.map(
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
                                        {label.name}
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
              {summaryLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Please wait, we are processing this API...
                    </p>
                  </div>
                </div>
              ) : summaryResponse ? (
                <div className="space-y-6">
                  {/* Summary Metadata */}
                  {summaryResponse.metadata && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                      <div>
                        <span className="text-muted-foreground">Audience:</span>
                        <p className="font-medium">
                          {summaryResponse.metadata?.audience || "General"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <p className="font-medium capitalize">
                          {summaryResponse.metadata?.format}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject:</span>
                        <p className="font-medium">
                          {summaryResponse.metadata?.subject || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Grade Level:
                        </span>
                        <p className="font-medium">
                          {summaryResponse.metadata?.grade_level}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Full Text */}
                  {summaryResponse.summary && (
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">
                        Resource Summary
                      </h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-line">
                          {summaryResponse.sections?.length &&
                          summaryResponse.sections.find(
                            (s) => s.heading == "Learning Objectives"
                          )
                            ? summaryResponse.sections
                                .find((s) => s.heading == "Learning Objectives")
                                .content.replace(/\n/g, " ")
                                .replace(/\*/g, " ")
                            : summaryResponse.summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Full Text */}
                  {documentData.summary_detailed && (
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">
                        Content Summary
                      </h3>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-line">
                          {documentData.summary_detailed}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Full Text */}
                  {documentData.extended?.media_summaries?.video
                    ?.scene_descriptions &&
                    documentData.extended?.media_summaries?.video
                      ?.scene_descriptions.length && (
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-3">
                          Scene Description
                        </h3>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ul className="list-disc ms-5">
                            {documentData.extended?.media_summaries?.video?.scene_descriptions.map(
                              (desc) => (
                                <li className="whitespace-pre-line mb-4">
                                  {desc}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                  {/* Structured Summary Data */}
                  {summaryResponse.sections &&
                    summaryResponse.sections.length && (
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-medium mb-3">
                          Structured Summary
                        </h3>
                        <div className="space-y-6">
                          {/* Objectives */}
                          {summaryResponse.sections && (
                            <div>
                              <ul
                                className="list-disc list-inside space-y-1 pl-2"
                                style={{ listStyleType: "none" }}
                              >
                                {summaryResponse.sections.map(
                                  (item: any, index: number) => (
                                    <div key={index}>
                                      <h4 className="font-medium text-md mb-2 flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                          {item.index}
                                        </div>
                                        {item.heading}
                                      </h4>
                                      <li className="text-sm">
                                        {item.content_summary
                                          ? item.content_summary
                                              .replace(/\n/g, " ")
                                              .replace(/\*/g, " ")
                                          : "No content available"}
                                      </li>
                                    </div>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                          {/*  */}
                        </div>
                      </div>
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

                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">
                      Generate Summary
                    </h3>
                    {/* <p className="text-sm text-muted-foreground mb-4">
                      Create a new summary with different length and focus
                      options
                    </p> */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={handleGenerateSummary}>
                        Generate Summary
                      </Button>
                    </div>
                  </div>
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
                        <p className="text-sm font-medium text-gray-700">
                          Title
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.filename}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Grade
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.grade}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Author
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.author}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Target Audience
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.target_audience}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Subject
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Language
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.language}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Publisher
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.publisher}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Publication Date
                        </p>
                        <p className="font-medium">
                          {excelMetadataResponse.document_info.publication_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Learning Objectives
                        </p>
                        <p className="font-medium">
                          {
                            excelMetadataResponse.document_info
                              .learning_objectives
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Summary
                        </p>
                        <p className="font-medium">
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

export default VideoDetail;
