import React from "react";
import {
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";

type CSVData = {
  headers: string[];
  rows: string[];
};

type CSVFile = {
  name: string;
  data: CSVData;
};

const loadCSVData = async (fs: File[]): Promise<CSVFile[]> => {
  const newData: CSVFile[] = await Promise.all(
    fs.map(async (f): Promise<CSVFile> => {
      const text: string[] = (await f.text()).split("\n").map((s) => {
        return s.replace(/\n/g, "").replace(/\n/g, "").replace(/#/g, "");
      });
      return {
        name: f.name,
        data: {
          headers: text[0].split(","),
          rows: text.slice(1),
        },
      };
    })
  );

  return newData;
};

const setIntersection = (l: Set<any>, r: Set<any>): Set<any> => {
  return new Set<any>(Array.from(l).filter((v) => r.has(v)));
};

const App: React.FC = () => {
  const [deduplicationHeader, setDeduplicationHeader] =
    React.useState<string>();
  const [duplicates, setDuplicates] = React.useState<number>();
  const [files, setFiles] = React.useState<CSVFile[]>([]);
  const [caseSensitive, setCaseSensitive] = React.useState<boolean>(true);
  const [commonHeaders, setCommonHeaders] = React.useState<string[]>([]);
  const [outputData, setOutputData] = React.useState<string[]>();
  const [processing, setProcessing] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (files.length > 0) {
      const allHeaders = files.map((value) => {
        return new Set(value.data.headers);
      });
      setCommonHeaders(
        Array.from(
          allHeaders.reduceRight(
            (prev, curr): Set<string> => setIntersection(prev, curr)
          )
        )
      );
    } else {
      setCommonHeaders([]);
    }
  }, [files]);

  const onFileInputChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetFiles = e.target.files;
      if (targetFiles) {
        // Narrow down what files are new and need to be loaded
        const existingFilenames: string[] = files.map((csvFile) => {
          return csvFile.name;
        });
        const newFiles: File[] = [];
        for (var i = 0; i < targetFiles.length; i++) {
          if (!existingFilenames.includes(targetFiles[i].name)) {
            newFiles.push(targetFiles[i]);
          }
        }

        // Go load the data
        const fs: CSVFile[] = await loadCSVData(newFiles);
        setFiles((arr) =>
          [...arr, ...fs].sort((a, b) => {
            return a.name.localeCompare(b.name);
          })
        );
      }
    },
    [files, setFiles]
  );

  React.useEffect(() => {
    if (deduplicationHeader) {
      const dedupe = async () => {
        const uniqueKeys = new Set<string>();
        const data: string[] = [];
        let dupes = 0;
        files.forEach((file) => {
          // Add the headers
          data.push(file.data.headers.join(","));
          const index = file.data.headers.indexOf(deduplicationHeader);
          file.data.rows.forEach((row) => {
            const key = caseSensitive
              ? row.split(",")[index]
              : row.split(",")[index].toLocaleLowerCase();
            if (!uniqueKeys.has(key)) {
              uniqueKeys.add(key);
              data.push(row);
            } else {
              dupes++;
            }
          });
        });
        console.log(data.length);
        setDuplicates(dupes);
        setOutputData(data);
      };

      dedupe();
    }

    setDeduplicationHeader(undefined);
    setProcessing(false);
  }, [
    caseSensitive,
    deduplicationHeader,
    files,
    setDeduplicationHeader,
    setProcessing,
  ]);

  return (
    <>
      <Stack p={2} spacing={2}>
        <Stack direction="row" spacing={2}>
          <Typography variant="h4">CSV Deduplicator</Typography>
          <Button
            endIcon={<Add />}
            onClick={() => {
              const inputElement = document.getElementById("hidden-input");
              if (inputElement) {
                inputElement.click();
              }
            }}
            variant="contained"
          >
            Add CSV
          </Button>
        </Stack>
        {files.length > 0 && (
          <>
            <Divider />
            <Typography variant="h5">Loaded Files</Typography>
            {files.map((file) => {
              return (
                <Stack
                  alignItems="center"
                  direction="row"
                  key={`file-${file.name}`}
                  spacing={2}
                >
                  <Divider />
                  <Typography>{file.name}</Typography>
                  <IconButton
                    onClick={() => {
                      setFiles((arr) =>
                        arr.filter((value) => {
                          return value.name !== file.name;
                        })
                      );
                      const inputElement =
                        document.getElementById("hidden-input");
                      if (inputElement) {
                        (inputElement as HTMLInputElement).files = null;
                      }
                    }}
                  >
                    <Close />
                  </IconButton>
                </Stack>
              );
            })}
          </>
        )}
        {commonHeaders.length > 0 && files.length > 1 && (
          <>
            <Divider />
            <Stack alignItems="center" direction="row" spacing={2}>
              <Typography variant="h5">
                Available Deduplication Columns
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(_, checked) => {
                      setCaseSensitive(checked);
                      setOutputData(undefined);
                    }}
                    value={caseSensitive}
                  />
                }
                label="Case Sensitive"
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              {Array.from(commonHeaders).map((value) => {
                return (
                  <Button
                    disabled={processing}
                    key={`header-${value}`}
                    onClick={() => {
                      setProcessing(true);
                      setDeduplicationHeader(value);
                    }}
                    variant="contained"
                  >
                    {value}
                  </Button>
                );
              })}
            </Stack>
            {processing && (
              <Stack alignItems="center" direction="row" spacing={2}>
                <Typography>
                  Deduplicating using column "{deduplicationHeader}"
                </Typography>
                <CircularProgress />
              </Stack>
            )}
            {outputData && (
              <>
                <Divider />
                <Stack spacing={2}>
                  <Typography>
                    Processed {files.length} files, finding {duplicates}{" "}
                    duplicates and {outputData.length - files.length} unique
                    keys
                    {caseSensitive
                      ? " (Case Sensitive)."
                      : " (Case Insensitive)."}
                  </Typography>
                  <Stack direction="row">
                    <Button
                      onClick={() => {
                        const dataString = outputData.join("\n");
                        window.open(
                          `data:text/csv;charset=utf-8,${dataString}`
                        );
                      }}
                      variant="contained"
                    >
                      Download
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </>
        )}
      </Stack>
      <input
        accept=".csv"
        id="hidden-input"
        multiple
        onChange={(event) => onFileInputChange(event)}
        style={{ display: "none" }}
        type="file"
      />
    </>
  );
};

export default App;
