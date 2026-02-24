import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { FileUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  uploadDocument,
  getTaskProgress,
  listTasks,
  TaskProgressResponse,
  TaskSummary,
} from "@/services/api";

export function UploadDocumentForm() {
  const [file, setFile] = useState<File | null>(null);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [useCelery, setUseCelery] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [inProgressTasks, setInProgressTasks] = useState<TaskSummary[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const syncProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    // Cleanup function to clear any existing intervals
    return () => {
      if (window.uploadProgressInterval) {
        clearInterval(window.uploadProgressInterval);
      }
    };
  }, []);

  // Load in-progress tasks on component mount
  useEffect(() => {
    if (token) {
      loadInProgressTasks();
    }
  }, [token]);

  const loadInProgressTasks = async () => {
    if (!token) return;

    setLoadingTasks(true);
    try {
      const response = await listTasks(0, 50, "PROGRESS", undefined, token);

      if (response.error) {
        console.error("Error loading tasks:", response.error);
        return;
      }

      if (response.data) {
        setInProgressTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Error loading in-progress tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setAutoCategorize(true);
    setUseCelery(true);
    setUploadProgress(0);
    setProgressMessage("");
    setTaskId(null);
    
    // Clear sync progress interval if it exists
    if (syncProgressIntervalRef.current) {
      clearInterval(syncProgressIntervalRef.current);
      syncProgressIntervalRef.current = null;
    }
    
    // Reset file input
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const pollTaskProgress = async (taskId: string) => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const response = await getTaskProgress(taskId, token);

        if (response.error) {
          console.error("Progress polling error:", response.error);
          clearInterval(interval);
          setIsUploading(false);
          toast.error("Failed to track upload progress");
          return;
        }

        if (response.data) {
          const progress = response.data as TaskProgressResponse;
          setUploadProgress(progress.percentage);
          setProgressMessage(progress.message);

          if (progress.status === "complete") {
            clearInterval(interval);
            setIsUploading(false);
            setUploadProgress(100);
            setProgressMessage("Upload completed successfully!");

            // Don't reset form or navigate - allow user to upload another document
            toast.success(`Successfully uploaded ${file?.name}`);

            // Refresh the task list to show the new task
            loadInProgressTasks();
          } else if (progress.status === "failed") {
            clearInterval(interval);
            setIsUploading(false);
            toast.error(`Upload failed: ${progress.message}`);
          }
        }
      } catch (error) {
        console.error("Progress polling error:", error);
        clearInterval(interval);
        setIsUploading(false);
        toast.error("Failed to track upload progress");
      }
    }, 2000); // Poll every 2 seconds

    // Store interval reference for cleanup
    window.uploadProgressInterval = interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProgressMessage(useCelery ? "Starting upload..." : "Processing document...");

    // For sync mode, simulate progress updates
    if (!useCelery) {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) {
            setProgressMessage("Processing document...");
            return prev + Math.random() * 15; // Random progress increment
          }
          return prev;
        });
      }, 200);

      // Store interval for cleanup
      syncProgressIntervalRef.current = progressInterval;
    }

    try {
      const response = await uploadDocument(file, token, autoCategorize, useCelery);

      if (response.error) {
        toast.error(response.error);
        setIsUploading(false);
        return;
      }

      if (response.data) {
        const uploadResponse = response.data as any;

        if (uploadResponse.task_id) {
          // Asynchronous processing (Celery)
          setTaskId(uploadResponse.task_id);
          setProgressMessage("Upload started, processing document...");
          resetForm();
          setIsUploading(false);
          // Start polling for progress
          pollTaskProgress(uploadResponse.task_id);

          // Refresh the task list to show the new task
          loadInProgressTasks();
        } else if (uploadResponse.document_id) {
          // Synchronous processing (immediate completion)
          setUploadProgress(100);
          setProgressMessage("Processing completed successfully!");
          
          // Small delay to show completion
          setTimeout(() => {
            // Clear sync progress interval if it exists
            if (syncProgressIntervalRef.current) {
              clearInterval(syncProgressIntervalRef.current);
              syncProgressIntervalRef.current = null;
            }
            
            setIsUploading(false);
            toast.success(`Successfully uploaded ${file.name}`);
            
            // Show processing mode in success message
            const processingMode = useCelery ? "asynchronously" : "synchronously";
            toast.info(`Document processed ${processingMode}`);

            // Reset form after successful upload
            resetForm();

            // Refresh the task list
            loadInProgressTasks();
          }, 500);
        } else {
          // Fallback for immediate completion without document_id
          setUploadProgress(100);
          setProgressMessage("Processing completed successfully!");
          
          // Small delay to show completion
          setTimeout(() => {
            // Clear sync progress interval if it exists
            if (syncProgressIntervalRef.current) {
              clearInterval(syncProgressIntervalRef.current);
              syncProgressIntervalRef.current = null;
            }
            
            setIsUploading(false);
            toast.success(`Successfully uploaded ${file.name}`);

            // Reset form after successful upload
            resetForm();

            // Refresh the task list
            loadInProgressTasks();
          }, 500);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
      
      // Clear sync progress interval if it exists
      if (syncProgressIntervalRef.current) {
        clearInterval(syncProgressIntervalRef.current);
        syncProgressIntervalRef.current = null;
      }
      
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROGRESS":
      case "processing":
        return "text-blue-600";
      case "SUCCESS":
      case "complete":
        return "text-green-600";
      case "FAILURE":
      case "failed":
        return "text-red-600";
      case "PENDING":
        return "text-yellow-600";
      case "stuck":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload a PDF, image, or video file to analyze
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {file ? file.name : "Drag and drop or click to upload"}
                </p>
                <Input
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file")?.click()}
                  className="mt-2"
                >
                  Select File
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {progressMessage}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-categorize"
                checked={autoCategorize}
                onCheckedChange={(checked) =>
                  setAutoCategorize(checked as boolean)
                }
              />
              <Label htmlFor="auto-categorize">
                Automatically categorize document
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-celery"
                checked={useCelery === true}
                onCheckedChange={(checked) => setUseCelery(checked as boolean)}
              />
              <Label htmlFor="use-celery">
                Use Celery for background processing
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex space-x-2 w-full">
              <Button
                type="submit"
                className="flex-1"
                disabled={!file || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isUploading}
              >
                Clear Form
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* In-Progress Tasks Section */}
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Processing Tasks</CardTitle>
              <CardDescription>
                Monitor your document processing tasks
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInProgressTasks}
              disabled={loadingTasks}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loadingTasks ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : inProgressTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No in-progress tasks found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <div
                  key={task.task_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-sm">
                          {task.filename || task.task_name}
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                            task.status
                          )} bg-gray-100`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Progress:</span>{" "}
                          {task.percentage || 0}%
                        </div>
                        <div>
                          <span className="font-medium">Step:</span>{" "}
                          {task.current_step || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>{" "}
                          {formatDuration(task.duration)}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {task.created_at
                            ? new Date(task.created_at).toLocaleString()
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {task.percentage &&
                    task.percentage > 0 &&
                    task.percentage < 100 && (
                      <div className="mt-3">
                        <Progress
                          value={task.percentage}
                          className="w-full h-2"
                        />
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
