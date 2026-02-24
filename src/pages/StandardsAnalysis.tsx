import { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileText, Book } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import {
  uploadFileForStandardsAnalysis,
  StandardsAnalysisResponse,
} from "@/services/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const STORAGE_KEY = "standards_analysis_cache";

interface CachedData {
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } | null;
  standardSet: string;
  results: StandardsAnalysisResponse | null;
  excelFile: string | null;
  excelData: any[][];
  headers: string[];
  activeSheet: string;
  sheetNames: string[];
  timestamp: number;
  // Add stats data to the cache
  standardsData?: any[];
  coverageStats?: {
    covered: any[];
    partiallyCovered: any[];
    missing: any[];
  };
  subjectStats?: any[];
}

const StandardsAnalysis = () => {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [standardSet, setStandardSet] = useState(
    "California Content Standards"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<StandardsAnalysisResponse | null>(
    null
  );
  const [excelFile, setExcelFile] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [cacheKey, setCacheKey] = useState<string>("");

  // Stats tracking
  const [standardsData, setStandardsData] = useState<any[]>([]);
  const [coverageStats, setCoverageStats] = useState({
    covered: [] as any[],
    partiallyCovered: [] as any[],
    missing: [] as any[],
  });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);

  // Load cached data on initial render
  useEffect(() => {
    const cachedDataString = localStorage.getItem(STORAGE_KEY);
    if (cachedDataString) {
      try {
        const cachedData: CachedData = JSON.parse(cachedDataString);

        // Check if cache is still valid (24 hour expiration)
        const now = Date.now();
        const isExpired = now - cachedData.timestamp > 24 * 60 * 60 * 1000;

        if (!isExpired) {
          // Restore cached data
          setStandardSet(cachedData.standardSet);
          setResults(cachedData.results);
          setExcelData(cachedData.excelData);
          setHeaders(cachedData.headers);
          setActiveSheet(cachedData.activeSheet);
          setSheetNames(cachedData.sheetNames);

          // Handle Excel data visibility
          if (cachedData.excelData.length > 0) {
            // We can't directly restore Blob URLs across sessions
            // Will set a flag to show the Excel UI section
            setCacheKey(`${cachedData.standardSet}-${cachedData.timestamp}`);
            setExcelFile("cached"); // Using this as a flag to show Excel UI

            // Restore stats data if available
            if (cachedData.standardsData) {
              setStandardsData(cachedData.standardsData);
            }
            if (cachedData.coverageStats) {
              setCoverageStats(cachedData.coverageStats);
            }
            if (cachedData.subjectStats) {
              setSubjectStats(cachedData.subjectStats);
            }
          }
        } else {
          // Clear expired cache
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error("Error parsing cached data:", error);
      }
    }
  }, []);

  // Save current state to localStorage whenever key data changes
  useEffect(() => {
    if (results || excelData.length > 0) {
      const fileMetadata = file
        ? {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          }
        : null;

      const cacheData: CachedData = {
        file: fileMetadata,
        standardSet,
        results,
        excelFile,
        excelData,
        headers,
        activeSheet,
        sheetNames,
        // Save stats data
        standardsData,
        coverageStats,
        subjectStats,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
    }
  }, [
    results,
    excelFile,
    excelData,
    headers,
    activeSheet,
    sheetNames,
    standardSet,
    file,
  ]);

  // Clean up the blob URL when component unmounts or when a new URL is created
  useEffect(() => {
    return () => {
      if (excelFile) {
        window.URL.revokeObjectURL(excelFile);
      }
    };
  }, [excelFile]);

  // Process Excel data to generate statistics
  useEffect(() => {
    if (excelData.length === 0 || headers.length === 0) return;

    // Define our storage arrays
    const standards: any[] = [];
    const covered: any[] = [];
    const partiallyCovered: any[] = [];
    const missing: any[] = [];
    const subjectCoverage: Record<
      string,
      {
        name: string;
        covered: number;
        partiallyCovered: number;
        missing: number;
        total: number;
      }
    > = {};

    // Process each row in the Excel data
    excelData.forEach((row) => {
      if (!row || row.length < 10) return; // Skip rows that don't have enough data

      const subject = row[4]?.toString() || "Unknown";
      const chapter = row[5]?.toString() || "Unknown";

      // Initialize subject stats if needed
      if (!subjectCoverage[subject]) {
        subjectCoverage[subject] = {
          name: subject,
          covered: 0,
          partiallyCovered: 0,
          missing: 0,
          total: 0,
        };
      }

      // Process standards in this row (main standards and additional ones)
      // The pattern in the data is: Standard Code, Standard Description, Coverage_Status, Evidence
      // This repeats for each standard in the row
      for (let i = 0; i < Math.floor((row.length - 8) / 4); i++) {
        const baseIndex = 8 + i * 4; // Starting index for this standard

        // Only process if we have a standard code and status
        if (row[baseIndex] && row[baseIndex + 2]) {
          const code = row[baseIndex]?.toString() || "";
          const description = row[baseIndex + 1]?.toString() || "";
          const status = row[baseIndex + 2]?.toString() || "";
          const evidence = row[baseIndex + 3]?.toString() || "";

          // Create standard object
          const standard = {
            subject,
            chapter,
            code,
            description,
            status,
            evidence,
          };

          // Add to standards list
          standards.push(standard);

          // Categorize by coverage status
          if (status.toUpperCase() === "COVERED") {
            covered.push(standard);
            subjectCoverage[subject].covered++;
          } else if (
            status.toUpperCase() === "PARTIALLY_COVERED" ||
            status.toUpperCase() === "PARTIALLY COVERED"
          ) {
            partiallyCovered.push(standard);
            subjectCoverage[subject].partiallyCovered++;
          } else if (status.toUpperCase() === "MISSING") {
            missing.push(standard);
            subjectCoverage[subject].missing++;
          }

          subjectCoverage[subject].total++;
        }
      }
    });

    // Convert subject coverage object to array for charts
    const subjectArray = Object.values(subjectCoverage);

    // Update state with the processed data
    setStandardsData(standards);
    setCoverageStats({
      covered,
      partiallyCovered,
      missing,
    });
    setSubjectStats(subjectArray);
  }, [excelData, headers]);

  // Parse Excel data from blob using useMemo to prevent redundant parsing
  const parseExcelFile = useMemo(
    () => async (blob: Blob) => {
      try {
        const buffer = await blob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        // Get sheet names
        const sheets = workbook.SheetNames;
        setSheetNames(sheets);

        if (sheets.length > 0) {
          // Use first sheet by default
          const firstSheet = sheets[0];
          setActiveSheet(firstSheet);

          // Parse sheet data
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Extract headers (first row) and data
          if (jsonData.length > 0) {
            const headerRow = jsonData[0] as string[];
            setHeaders(headerRow);
            setExcelData(jsonData.slice(1) as any[][]);
          }
        }
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast.error("Failed to parse Excel file");
      }
    },
    []
  );

  // Switch between sheets
  const handleSheetChange = (sheetName: string) => {
    if (sheetNames.includes(sheetName)) {
      setActiveSheet(sheetName);

      try {
        // Re-fetch data for the selected sheet
        fetch(excelFile!)
          .then((response) => response.arrayBuffer())
          .then((buffer) => {
            const workbook = XLSX.read(buffer, { type: "array" });
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              const headerRow = jsonData[0] as string[];
              setHeaders(headerRow);
              setExcelData(jsonData.slice(1) as any[][]);
            }
          });
      } catch (error) {
        console.error("Error switching sheets:", error);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Use memoized function for checking cached data
  const checkCacheAndLoadData = useMemo(
    () =>
      (fileObj: File, standardSetValue: string): boolean => {
        const cachedDataString = localStorage.getItem(STORAGE_KEY);
        if (!cachedDataString) return false;

        try {
          const cachedData: CachedData = JSON.parse(cachedDataString);

          // Check if cache is still valid (24 hour expiration)
          const now = Date.now();
          const isExpired = now - cachedData.timestamp > 24 * 60 * 60 * 1000;
          if (isExpired) {
            localStorage.removeItem(STORAGE_KEY);
            return false;
          }

          // Check if we have the same standard set and file
          if (
            cachedData.standardSet === standardSetValue &&
            cachedData.file &&
            fileObj.name === cachedData.file.name &&
            fileObj.size === cachedData.file.size
          ) {
            // Restore cached data
            setExcelData(cachedData.excelData);
            setHeaders(cachedData.headers);
            setActiveSheet(cachedData.activeSheet);
            setSheetNames(cachedData.sheetNames);
            setResults(cachedData.results);

            // For Excel files, set the flag to display Excel UI
            if (cachedData.excelData.length > 0) {
              const key = `${standardSetValue}-${cachedData.timestamp}`;
              setCacheKey(key);
              setExcelFile("cached"); // Using this as a flag to show Excel UI

              // Restore stats data if available
              if (cachedData.standardsData) {
                setStandardsData(cachedData.standardsData);
              }
              if (cachedData.coverageStats) {
                setCoverageStats(cachedData.coverageStats);
              }
              if (cachedData.subjectStats) {
                setSubjectStats(cachedData.subjectStats);
              }
            }

            return true;
          }
        } catch (error) {
          console.error("Error parsing cached data:", error);
        }

        return false;
      },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standardSet.trim()) {
      toast.error("Please enter a standard set");
      return;
    }

    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!token) {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }

    // Check if we already have cached results for this file and standard set
    // if (checkCacheAndLoadData(file, standardSet)) {
    //   toast.success("Loaded cached analysis results");
    //   return;
    // }
    localStorage.removeItem(STORAGE_KEY);

    setExcelFile(null);
    setExcelData([]);
    setActiveSheet("");
    setHeaders([]);
    setSheetNames([]);
    setIsLoading(true);
    try {
      const response = await uploadFileForStandardsAnalysis(
        file,
        standardSet,
        token
      );

      if (response.error) {
        toast.error(response.error);
      } else if (response.data) {
        // Handle the blob response (Excel file)
        const blob = response.data as unknown as Blob;
        if (
          blob.type ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          blob.type === "application/vnd.ms-excel" ||
          blob.type === "application/octet-stream"
        ) {
          // Create a URL for the blob
          const url = window.URL.createObjectURL(blob);
          setExcelFile(url);

          // Parse the Excel file to display in a table
          await parseExcelFile(blob);

          // Reset the JSON results since we're getting an Excel file
          setResults(null);

          toast.success(
            "Analysis completed successfully! Excel file ready to view."
          );
        } else {
          // If the response is JSON (for backward compatibility)
          setResults(response.data as unknown as StandardsAnalysisResponse);
          setExcelFile(null);
          toast.success("Gap Analysis completed successfully!");
        }
      }
    } catch (error) {
      console.error("Error analyzing standards:", error);
      toast.error("Failed to analyze standards");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Gap Analysis</h1>
        <p className="text-muted-foreground">
          Analyze documents against educational standards to identify alignments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-6">
          <Card className="">
            <CardHeader className="w-full">
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload a document to analyze against educational standards
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="standard-set">
                    Standard Set <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="standard-set"
                    value={standardSet}
                    onChange={(e) => setStandardSet(e.target.value)}
                    placeholder="Enter a standard set"
                    required
                  />
                </div>

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
                      accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
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
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!standardSet.trim() || !file || isLoading}
                >
                  {isLoading ? "Analyzing..." : "Analyze Standards"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        <div className="lg:col-span-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                Identified standards and alignment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Analyzing document against standards...</p>
                </div>
              ) : excelFile ? (
                <div className="py-4 space-y-4">
                  <div className="mb-4 text-center">
                    <FileText className="h-16 w-16 text-slate-200 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">
                      Excel Report Ready
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your standards analysis has been generated as an Excel
                      file.
                    </p>
                    <Button
                      onClick={() => {
                        // If we have a valid Blob URL, use it directly
                        if (excelFile) {
                          window.open(excelFile, "_blank");
                        }
                        // If we have a cacheKey but no blob URL, we need to notify the user
                        // to resubmit the analysis to get the Excel file again
                        else if (cacheKey) {
                          toast.info(
                            "Please resubmit the analysis to download the Excel file."
                          );
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Download Excel Report
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 mb-6">
                      The file will open in a new tab for you to save.
                    </p>
                  </div>
                </div>
              ) : results ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-md">
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">
                        Document
                      </h3>
                      <p className="font-semibold">{results.document_name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">
                        Standard Set
                      </h3>
                      <p className="font-semibold">{results.standard_set}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">
                        Grade Level
                      </h3>
                      <p className="font-semibold">{results.grade_level}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">
                        Subject
                      </h3>
                      <p className="font-semibold">{results.subject}</p>
                    </div>
                  </div>

                  <Tabs defaultValue="found" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="found">
                        Found Standards ({results.standards_analysis.length})
                      </TabsTrigger>
                      <TabsTrigger value="missing">
                        Missing Standards (
                        {results.missing_standards?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="found">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Aligned Standards
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Found {results.standards_analysis.length} standards
                          aligned with this document
                        </p>

                        <Accordion type="single" collapsible className="w-full">
                          {results.standards_analysis.map((standard, index) => (
                            <AccordionItem
                              value={`standard-${index}`}
                              key={index}
                            >
                              <AccordionTrigger>
                                <div className="flex items-center gap-2 text-left">
                                  <span>{standard.standard_code}</span>
                                  <Badge variant="outline">
                                    {standard.standard_grade}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pl-2">
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Title
                                    </h4>
                                    <p>{standard.title}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Description
                                    </h4>
                                    <p>{standard.description}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Standard Description
                                    </h4>
                                    <p>{standard.standard_description}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Subject
                                    </h4>
                                    <p>{standard.subject}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Standard Set
                                    </h4>
                                    <p>{standard.standard_set}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Grades
                                    </h4>
                                    <div className="flex gap-1 mt-1">
                                      {standard.grades.map((grade, i) => (
                                        <Badge key={i} variant="secondary">
                                          {grade}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </TabsContent>

                    <TabsContent value="missing">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Missing Standards
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Found {results.missing_standards?.length || 0}{" "}
                          standards that are missing from this document
                        </p>

                        {results.missing_standards &&
                        results.missing_standards.length > 0 ? (
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                          >
                            {results.missing_standards.map(
                              (standard, index) => (
                                <AccordionItem
                                  value={`missing-${index}`}
                                  key={index}
                                >
                                  <AccordionTrigger>
                                    <div className="flex items-center gap-2 text-left">
                                      <span>{standard.standard_code}</span>
                                      <Badge
                                        variant="outline"
                                        className="bg-red-50"
                                      >
                                        {standard.standard_grade}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3 pl-2">
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Title
                                        </h4>
                                        <p>{standard.title}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Description
                                        </h4>
                                        <p>{standard.description}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Standard Description
                                        </h4>
                                        <p>{standard.standard_description}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Subject
                                        </h4>
                                        <p>{standard.subject}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Standard Set
                                        </h4>
                                        <p>{standard.standard_set}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Grades
                                        </h4>
                                        <div className="flex gap-1 mt-1">
                                          {standard.grades.map((grade, i) => (
                                            <Badge key={i} variant="secondary">
                                              {grade}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              )
                            )}
                          </Accordion>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>No missing standards were identified.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">
                      Processing Information
                    </h3>
                    <div className="text-sm">
                      <p>
                        <span className="text-muted-foreground">
                          Total Chunks:
                        </span>{" "}
                        {results.processing_info.total_chunks}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Total Standards Found:
                        </span>{" "}
                        {results.processing_info.total_standards_found}
                      </p>
                      {results.processing_info.total_missing_standards !==
                        undefined && (
                        <p>
                          <span className="text-muted-foreground">
                            Total Missing Standards:
                          </span>{" "}
                          {results.processing_info.total_missing_standards}
                        </p>
                      )}
                      <p>
                        <span className="text-muted-foreground">
                          Processing Time:
                        </span>{" "}
                        {new Date(
                          results.processing_info.processing_timestamp
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                  <Book className="h-16 w-16 mb-4 text-slate-200" />
                  <p className="text-lg">
                    Upload a document to see Gap Analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-12">
          {!isLoading ? (
            excelFile ? (
              <>
                {/* Coverage Statistics Summary */}
                {standardsData.length > 0 && (
                  <div className="mt-8 bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="text-xl font-bold mb-4">
                      Coverage Statistics
                    </h3>

                    {/* Overall Distribution */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">
                        Standards Coverage Distribution
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Covered */}
                        <div
                          className="bg-green-50 p-4 rounded-lg border border-green-100 relative group"
                          title={coverageStats.covered
                            .map((item) => item.code)
                            .join(", ")}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Covered</span>
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800"
                            >
                              {(
                                (coverageStats.covered.length /
                                  standardsData.length) *
                                100
                              ).toFixed(1)}
                              %
                            </Badge>
                          </div>
                          <p className="text-3xl font-bold text-green-700">
                            {coverageStats.covered.length}
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            of {standardsData.length} standards
                          </p>

                          {/* Tooltip for standards */}
                          <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-normal break-words">
                            {coverageStats.covered.length > 0
                              ? coverageStats.covered
                                  .map((item) => item.code)
                                  .join(", ")
                              : "No covered standards"}
                          </div>
                        </div>

                        {/* Partially Covered */}
                        <div
                          className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 relative group"
                          title={coverageStats.partiallyCovered
                            .map((item) => item.code)
                            .join(", ")}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">
                              Partially Covered
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800"
                            >
                              {(
                                (coverageStats.partiallyCovered.length /
                                  standardsData.length) *
                                100
                              ).toFixed(1)}
                              %
                            </Badge>
                          </div>
                          <p className="text-3xl font-bold text-yellow-700">
                            {coverageStats.partiallyCovered.length}
                          </p>
                          <p className="text-sm text-yellow-600 mt-1">
                            of {standardsData.length} standards
                          </p>

                          {/* Tooltip for standards */}
                          <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-normal break-words">
                            {coverageStats.partiallyCovered.length > 0
                              ? coverageStats.partiallyCovered
                                  .map((item) => item.code)
                                  .join(", ")
                              : "No partially covered standards"}
                          </div>
                        </div>

                        {/* Missing */}
                        <div
                          className="bg-red-50 p-4 rounded-lg border border-red-100 relative group"
                          title={coverageStats.missing
                            .map((item) => item.code)
                            .join(", ")}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Missing</span>
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800"
                            >
                              {(
                                (coverageStats.missing.length /
                                  standardsData.length) *
                                100
                              ).toFixed(1)}
                              %
                            </Badge>
                          </div>
                          <p className="text-3xl font-bold text-red-700">
                            {coverageStats.missing.length}
                          </p>
                          <p className="text-sm text-red-600 mt-1">
                            of {standardsData.length} standards
                          </p>

                          {/* Tooltip for standards */}
                          <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-normal break-words">
                            {coverageStats.missing.length > 0
                              ? coverageStats.missing
                                  .map((item) => item.code)
                                  .join(", ")
                              : "No missing standards"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subject Distribution */}
                    {subjectStats.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3">
                          Coverage by Subject
                        </h4>
                        <div className="space-y-4">
                          {subjectStats.map((subject, index) => (
                            <div
                              key={index}
                              className="bg-slate-50 p-4 rounded-lg border"
                            >
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-medium text-slate-800">
                                  {subject.name}
                                </h5>
                                <span className="text-sm text-slate-500">
                                  {subject.total} standards
                                </span>
                              </div>

                              {/* Progress bars */}
                              <div className="space-y-2">
                                <div className="relative group">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Covered</span>
                                    <span className="text-green-700">
                                      {subject.covered} (
                                      {(
                                        (subject.covered / subject.total) *
                                        100
                                      ).toFixed(1)}
                                      %)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subject.covered / subject.total) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>

                                  {/* Tooltip for covered standards by subject */}
                                  <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-0 mb-1 whitespace-normal break-words">
                                    {coverageStats.covered
                                      .filter(
                                        (item) => item.subject === subject.name
                                      )
                                      .map((item) => item.code)
                                      .join(", ") || "No covered standards"}
                                  </div>
                                </div>

                                <div className="relative group">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Partially Covered</span>
                                    <span className="text-yellow-700">
                                      {subject.partiallyCovered} (
                                      {(
                                        (subject.partiallyCovered /
                                          subject.total) *
                                        100
                                      ).toFixed(1)}
                                      %)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-yellow-500 h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subject.partiallyCovered /
                                            subject.total) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>

                                  {/* Tooltip for partially covered standards by subject */}
                                  <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-0 mb-1 whitespace-normal break-words">
                                    {coverageStats.partiallyCovered
                                      .filter(
                                        (item) => item.subject === subject.name
                                      )
                                      .map((item) => item.code)
                                      .join(", ") ||
                                      "No partially covered standards"}
                                  </div>
                                </div>

                                <div className="relative group">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Missing</span>
                                    <span className="text-red-700">
                                      {subject.missing} (
                                      {(
                                        (subject.missing / subject.total) *
                                        100
                                      ).toFixed(1)}
                                      %)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-red-500 h-2 rounded-full"
                                      style={{
                                        width: `${
                                          (subject.missing / subject.total) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>

                                  {/* Tooltip for missing standards by subject */}
                                  <div className="absolute invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg max-w-xs text-xs z-50 bottom-full left-0 mb-1 whitespace-normal break-words">
                                    {coverageStats.missing
                                      .filter(
                                        (item) => item.subject === subject.name
                                      )
                                      .map((item) => item.code)
                                      .join(", ") || "No missing standards"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="py-4 space-y-4">
                  {/* Excel Sheet Selection */}
                  {sheetNames.length > 1 && (
                    <div className="mb-4">
                      <Label htmlFor="sheet-select">Sheet:</Label>
                      <Select
                        value={activeSheet}
                        onValueChange={handleSheetChange}
                      >
                        <SelectTrigger id="sheet-select" className="w-[200px]">
                          <SelectValue placeholder="Select a sheet" />
                        </SelectTrigger>
                        <SelectContent>
                          {sheetNames.map((sheet) => (
                            <SelectItem key={sheet} value={sheet}>
                              {sheet}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Excel Data Cards Display */}
                  {headers.length > 0 && (
                    <div>
                      {/* Optional filter controls could go here */}

                      <div className="space-y-6">
                        {excelData
                          .filter((row) => {
                            // Find the index of the Client Item ID column if it exists
                            const clientIdIndex = headers.findIndex(
                              (header) =>
                                header === "Client Item ID" ||
                                header === "Client_Item_ID"
                            );

                            // If there's no such column or the cell value isn't "client_id", keep the row
                            return (
                              clientIdIndex === -1 ||
                              row[clientIdIndex]?.toString() !== "client_id"
                            );
                          })
                          .map((row, rowIndex) => {
                            // Get column indices for primary fields
                            const clientItemIdIndex = headers.findIndex(
                              (h) => h === "Client Item ID"
                            );
                            const gradeIndex = headers.findIndex(
                              (h) => h === "Grade(s)"
                            );
                            const titleIndex = headers.findIndex(
                              (h) => h === "Title"
                            );
                            const descIndex = headers.findIndex(
                              (h) => h === "Description"
                            );
                            const subjectIndex = headers.findIndex(
                              (h) => h === "Subject"
                            );
                            const chapterIndex = headers.findIndex(
                              (h) => h === "Chapter Name"
                            );
                            const standardSetIndex = headers.findIndex(
                              (h) => h === "Standard Set"
                            );

                            // Collect all standard-related fields
                            const standardEntries = [];
                            for (let i = 0; i < headers.length; i++) {
                              const header = headers[i];
                              if (header.startsWith("Standard Code")) {
                                const baseIndex = i;
                                const descIndex = headers.findIndex(
                                  (h) =>
                                    h ===
                                    `Standard Description${
                                      header === "Standard Code"
                                        ? ""
                                        : header.replace("Standard Code", "")
                                    }`
                                );
                                const coverageIndex = headers.findIndex(
                                  (h) =>
                                    h ===
                                    `Coverage_Status${
                                      header === "Standard Code"
                                        ? ""
                                        : header.replace("Standard Code", "")
                                    }`
                                );
                                const evidenceIndex = headers.findIndex(
                                  (h) =>
                                    h ===
                                    `Evidence${
                                      header === "Standard Code"
                                        ? ""
                                        : header.replace("Standard Code", "")
                                    }`
                                );

                                // Only add if there's a standard code value
                                if (row[baseIndex]) {
                                  standardEntries.push({
                                    code: row[baseIndex]?.toString() || "",
                                    description:
                                      descIndex !== -1
                                        ? row[descIndex]?.toString() || ""
                                        : "",
                                    coverage:
                                      coverageIndex !== -1
                                        ? row[coverageIndex]?.toString() || ""
                                        : "",
                                    evidence:
                                      evidenceIndex !== -1
                                        ? row[evidenceIndex]?.toString() || ""
                                        : "",
                                  });
                                }
                              }
                            }

                            return (
                              <div
                                key={rowIndex}
                                className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                              >
                                {/* Header Section */}
                                <div className="bg-slate-50 p-4 border-b">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h3 className="font-semibold text-lg">
                                        {titleIndex !== -1
                                          ? row[titleIndex]?.toString() ||
                                            "Untitled"
                                          : "Untitled"}
                                      </h3>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {clientItemIdIndex !== -1 &&
                                          row[clientItemIdIndex] && (
                                            <Badge
                                              variant="outline"
                                              className="bg-blue-50"
                                            >
                                              Chapter:{" "}
                                              {row[chapterIndex]?.toString()}
                                            </Badge>
                                          )}
                                        {gradeIndex !== -1 &&
                                          row[gradeIndex] && (
                                            <Badge
                                              variant="secondary"
                                              className="bg-purple-50"
                                            >
                                              Grade:{" "}
                                              {row[gradeIndex]?.toString()}
                                            </Badge>
                                          )}
                                        {subjectIndex !== -1 &&
                                          row[subjectIndex] && (
                                            <Badge
                                              variant="secondary"
                                              className="bg-green-50"
                                            >
                                              {row[subjectIndex]?.toString()}
                                            </Badge>
                                          )}
                                      </div>
                                    </div>
                                    {standardSetIndex !== -1 &&
                                      row[standardSetIndex] && (
                                        <Badge
                                          variant="outline"
                                          className="bg-orange-50"
                                        >
                                          {row[standardSetIndex]?.toString()}
                                        </Badge>
                                      )}
                                  </div>
                                </div>

                                {/* Description Section */}
                                {descIndex !== -1 && row[descIndex] && (
                                  <div className="p-4 border-b">
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                                      Description
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {row[descIndex]?.toString()}
                                    </p>
                                  </div>
                                )}

                                {/* Standards Section */}
                                {standardEntries.length > 0 && (
                                  <div className="p-4">
                                    <h4 className="text-sm font-medium text-slate-700 mb-3">
                                      Standards Coverage
                                    </h4>
                                    <div className="space-y-4">
                                      {standardEntries.map(
                                        (standard, stdIndex) => (
                                          <div
                                            key={stdIndex}
                                            className="bg-slate-50 p-3 rounded-md"
                                          >
                                            <div className="flex justify-between items-center mb-2">
                                              <span className="font-medium text-slate-800">
                                                {standard.code}
                                              </span>
                                              {standard.coverage && (
                                                <Badge
                                                  variant="outline"
                                                  className={`${
                                                    standard.coverage.toLowerCase() ===
                                                    "covered"
                                                      ? "bg-green-50 text-green-700"
                                                      : standard.coverage.toLowerCase() ===
                                                        "partially covered"
                                                      ? "bg-yellow-50 text-yellow-700"
                                                      : "bg-red-50 text-red-700"
                                                  }`}
                                                >
                                                  {standard.coverage}
                                                </Badge>
                                              )}
                                            </div>
                                            {standard.description && (
                                              <p className="text-sm text-slate-600 mb-2">
                                                {standard.description}
                                              </p>
                                            )}
                                            {standard.evidence && (
                                              <div className="mt-2">
                                                <h5 className="text-xs font-medium text-slate-500 mb-1">
                                                  Evidence
                                                </h5>
                                                <p className="text-xs text-slate-600 bg-white p-2 rounded">
                                                  {standard.evidence}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Other fields could be added here if needed */}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {headers.length === 0 && excelData.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No data found in the Excel file.</p>
                    </div>
                  )}

                  {/* View Options */}
                </div>
              </>
            ) : (
              <></>
            )
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardsAnalysis;
