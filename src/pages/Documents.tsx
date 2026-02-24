import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/components/DocumentCard";
import { useNavigate } from "react-router-dom";
import { FileUp, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useAuth } from "@/context/AuthContext";
import {
  listDocuments,
  deleteDocument,
  DocumentListItem,
  DocumentListResponse,
} from "@/services/api";
import { toast } from "@/components/ui/sonner";

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { token } = useAuth();

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const DOCUMENTS_PER_PAGE = 10;
  const alert = useRef<HTMLButtonElement>();

  useEffect(() => {
    if (token) {
      loadDocuments();
    }
  }, [token, currentPage]);

  // Reset to first page when search term changes
  useEffect(() => {
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  }, [searchTerm]);

  const loadDocuments = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const skip = currentPage * DOCUMENTS_PER_PAGE;
      const response = await listDocuments(skip, DOCUMENTS_PER_PAGE, token);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      if (response.data) {
        const data = response.data as DocumentListResponse;
        setDocuments(data.documents || []);
        setTotalDocuments(data.total || 0);
        
        // Handle case where API doesn't return skip/limit fields
        const actualSkip = data.skip !== undefined ? data.skip : currentPage * DOCUMENTS_PER_PAGE;
        const actualLimit = data.limit !== undefined ? data.limit : DOCUMENTS_PER_PAGE;
        
        // Debug logging
        console.log('Pagination data:', {
          skip: data.skip,
          limit: data.limit,
          actualSkip,
          actualLimit,
          total: data.total,
          hasNext: actualSkip + actualLimit < data.total,
          hasPrev: actualSkip > 0
        });
        
        setHasNextPage(actualSkip + actualLimit < data.total);
        setHasPrevPage(actualSkip > 0);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Filter documents based on search term (client-side filtering for current page)
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.labels?.labels
        ?.map((l) => l.name)
        ?.some((label) =>
          label.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
      doc.metadata?.document_themes?.some((label) =>
        label.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  // When searching, show filtered results; when not searching, show all documents
  const displayedDocuments = searchTerm ? filteredDocuments : documents;
  const showPagination = !searchTerm && totalDocuments > DOCUMENTS_PER_PAGE;

  const [docToDelete, setDocToDelete] = useState<string>(null);

  const onDocDelete = (docId: string) => {
    const document = documents.find((d) => d.document_id == docId);

    if (document) {
      if (alert.current instanceof HTMLButtonElement) {
        alert.current.click();
      }
      setDocToDelete(docId);
    }
  };

  const onDocDeleteConfirm = async () => {
    if (!token || !docToDelete) return;

    try {
      const response = await deleteDocument(docToDelete, token);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      // Reload documents after successful deletion
      await loadDocuments();
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const totalPages = Math.ceil(totalDocuments / DOCUMENTS_PER_PAGE);
  const startDocument = currentPage * DOCUMENTS_PER_PAGE + 1;
  const endDocument = Math.min(
    (currentPage + 1) * DOCUMENTS_PER_PAGE,
    totalDocuments
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button
          onClick={() => navigate("/documents/upload")}
          className="bg-forest-600 hover:bg-forest-700"
        >
          <FileUp className="h-4 w-4 mr-2" />
          Upload New
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <Input
            placeholder="Search documents by name or labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <AlertDialog.Root>
        <AlertDialog.Trigger ref={alert} asChild>
          <button className="hidden inline-flex h-[35px] items-center justify-center rounded bg-violet4 px-[15px] font-medium leading-none text-violet11 outline-none outline-offset-1 hover:bg-mauve3 focus-visible:outline-2 focus-visible:outline-violet6 select-none">
            Delete account
          </button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-blackA6 data-[state=open]:animate-overlayShow" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-gray1 p-[25px] shadow-[var(--shadow-6)] focus:outline-none data-[state=open]:animate-contentShow">
            <AlertDialog.Title className="m-0 text-[17px] font-medium text-mauve12">
              Are you sure?
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-5 mt-[15px] text-[15px] leading-normal text-mauve11">
              This action cannot be undone. This will permanently delete the
              document.
            </AlertDialog.Description>
            <div className="flex justify-end gap-[25px]">
              <AlertDialog.Cancel asChild>
                <button className="inline-flex h-[35px] items-center justify-center rounded bg-mauve4 px-[15px] font-medium leading-none text-mauve11 outline-none outline-offset-1 hover:bg-mauve5 focus-visible:outline-2 focus-visible:outline-mauve7 select-none">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className="inline-flex h-[35px] items-center justify-center rounded bg-red4 px-[15px] font-medium leading-none text-red11 outline-none outline-offset-1 hover:bg-red5 focus-visible:outline-2 focus-visible:outline-red7 select-none"
                  onClick={onDocDeleteConfirm}
                >
                  Yes, delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Loading documents...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedDocuments.map((doc) => (
              <DocumentCard
                key={doc.document_id}
                id={doc.document_id}
                name={doc.document_info?.title || doc.filename}
                mimeType={doc.mime_type}
                uploadDate={doc.created_at.split("T")[0]}
                labels={
                  doc.labels?.labels?.map((l) => l.name) ||
                  doc.metadata?.document_themes ||
                  []
                }
                onView={() => {
                  if (doc.document_info) {
                    localStorage.setItem(
                      "documentInfo",
                      JSON.stringify(doc.document_info)
                    );
                  }
                  localStorage.removeItem("chapterLabels");

                  localStorage.setItem(
                    "lastUploadedDocumentId",
                    doc.document_id
                  );

                  if (doc.mime_type.startsWith("audio/")) {
                    navigate(`/audios/${doc.document_id}`);
                  } else if (doc.mime_type.startsWith("image/")) {
                    navigate(`/image/${doc.document_id}`);
                  } else if (doc.mime_type.startsWith("video/")) {
                    navigate(`/videos/${doc.document_id}`);
                  } else {
                    navigate(`/documents/${doc.document_id}`);
                  }
                }}
                onDelete={onDocDelete}
              />
            ))}
          </div>

          {displayedDocuments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                {searchTerm
                  ? "No documents found matching your search."
                  : "No documents found."}
              </p>
            </div>
          )}

          {/* Pagination Controls - Only show when not searching */}
          {showPagination && (
            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-muted-foreground">
                Showing {startDocument} to {endDocument} of {totalDocuments}{" "}
                documents
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Documents;
