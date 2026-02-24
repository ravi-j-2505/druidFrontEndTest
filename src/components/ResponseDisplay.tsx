import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";

// Helper function to check if a value is an object
const isObject = (value: any): boolean => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Helper function to check if a value is an array
const isArray = (value: any): boolean => {
  return Array.isArray(value);
};

interface ExpandableValueProps {
  value: any;
  nestingLevel?: number;
}

const ExpandableValue: React.FC<ExpandableValueProps> = ({ value, nestingLevel = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(nestingLevel < 1);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (value === null || value === undefined) {
    return <span className="text-gray-500">null</span>;
  }

  if (isObject(value)) {
    return (
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 p-1" 
          onClick={toggleExpand}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="ml-1 text-xs">Object {Object.keys(value).length > 0 ? `(${Object.keys(value).length} fields)` : ""}</span>
        </Button>
        {isExpanded && (
          <div className="pl-5 border-l-2 border-gray-200 ml-2 mt-1">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="py-1">
                <div className="flex">
                  <span className="text-sm font-medium text-gray-700 mr-2">{key}:</span>
                  <ExpandableValue value={val} nestingLevel={nestingLevel + 1} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isArray(value)) {
    return (
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 p-1" 
          onClick={toggleExpand}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="ml-1 text-xs">Array [{value.length}]</span>
        </Button>
        {isExpanded && (
          <div className="pl-5 border-l-2 border-gray-200 ml-2 mt-1">
            {value.map((item: any, index: number) => (
              <div key={index} className="py-1">
                <div className="flex">
                  <span className="text-sm font-medium text-gray-700 mr-2">[{index}]:</span>
                  <ExpandableValue value={item} nestingLevel={nestingLevel + 1} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For primitive values
  if (typeof value === 'string') {
    return <span className="text-green-600">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-600">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-purple-600">{value.toString()}</span>;
  }

  return <span>{String(value)}</span>;
};

interface ResponseDisplayProps {
  title: string;
  description?: string;
  response: any;
  endpoint?: string;
  method?: string;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  title,
  description,
  response,
  endpoint,
  method = "GET"
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    toast.success("Response copied to clipboard!");
  };

  return (
    <Card className="w-full my-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
        {endpoint && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs px-2 py-0">
              {method}
            </Badge>
            <code className="text-xs bg-muted p-1 rounded">{endpoint}</code>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-md overflow-x-auto">
          <ExpandableValue value={response} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponseDisplay;
