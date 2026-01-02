
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null); // Clear previous results when new file is selected
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/import-excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        toast({
          title: "Import Complete",
          description: `Successfully imported ${data.results.success} records. ${data.results.failed} failed.`
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.error || "An error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/admin/dashboard")}
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Import Alumni Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Excel File
            </label>
            <Input 
              type="file" 
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>

          <Button 
            onClick={handleImport} 
            disabled={!file || importing}
          >
            {importing ? "Importing..." : "Import Data"}
          </Button>

          {results && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Import Results:</h3>
              <p className="text-green-600">✓ Successfully imported: {results.success}</p>
              <p className="text-red-600">✗ Failed: {results.failed}</p>
              
              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {results.errors.map((error: string, idx: number) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Supported Excel Columns:</h4>
            <p className="text-sm text-gray-600 mb-2">The system will automatically detect columns with various names. Supported formats include:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Student Info:</p>
                <ul className="space-y-1 ml-4">
                  <li>• First Name / Name</li>
                  <li>• Last Name</li>
                  <li>• Email (required)</li>
                  <li>• Phone / Mobile / Contact</li>
                  <li>• Roll Number / Student ID</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Academic Info:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Graduation Year / Year</li>
                  <li>• Batch</li>
                  <li>• Course / Program</li>
                  <li>• Branch / Department</li>
                  <li>• CGPA / GPA</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Current Info:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Current City / Location</li>
                  <li>• Current Company / Organization</li>
                  <li>• Current Role / Designation</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Social:</p>
                <ul className="space-y-1 ml-4">
                  <li>• LinkedIn / LinkedIn URL</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
