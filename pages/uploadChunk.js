import React, { Component, useCallback, useMemo, useState , useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import SnackBarComponent from "../components/SnackBar/SnackBar";
import {
  FormHelperText,
  Button,
  IconButton,
} from "@material-ui/core";
import 'abortcontroller-polyfill';
import { useDropzone } from "react-dropzone";
var controller = new AbortController();
let signal = controller.signal;
import CloseIcon from "@material-ui/icons/Close";
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import _ from "lodash";
import axios from "axios";
import { ProgressBar } from 'react-bootstrap'

function Dropzone(props) {

  const onDrop = useCallback((files) => {
       console.log(files.length)
       files.length ? getFileContext(files) : props.FileError("Multiple files are not supported");     
  });

  const onDropRejected = (rejectedFiles) => {
    return (
      rejectedFiles &&
      rejectedFiles.length &&
      rejectedFiles[0].errors.map((item) => {
        if (item.code === "file-too-large")
          props.FileError(
            "File is too large. The maximum file size allowed is 1 GB."
          );
        else return null;
      })
    );
    // })
  };

  const getFileContext = (files) => {
    files.map(file=>  { 
    resetChunkProperties();
    const _file =file;
    setFileSize(_file.size)

    const _totalCount = _file.size % chunkSize == 0 ? _file.size / chunkSize : Math.floor(_file.size / chunkSize) + 1; // Total count of chunks need to be uploaded to finish the file
    setChunkCount(_totalCount)

    const _fileID = uuidv4() + "." + _file.name.split('.').pop();
    setFileGuid(_fileID)
    setFileToBeUpload(_file)}
    )
  }

  const fileUpload = async() => {
    setCounter(counter + 1);
    // console.log(fileToBeUpload , "File Upload()")
    const _fileID = fileGuid 
    console.log('total chunk count',chunkCount) 
    console.log('counter',counter)
    if (counter <= chunkCount) {
      var chunk = fileToBeUpload.slice(beginingOfTheChunk, endOfTheChunk);
      console.log('upload chunk api call')
      await uploadChunk(chunk,fileGuid);
    
    }
  };

  const uploadChunk = async (chunk,file) => {
    setShowProgress(true);
    try {
        
      const response = await axios.post(
        'http://79a862d240df.ngrok.io/UploadChunks',
        chunk,
        {
          params: {
            id: counter,
            fileName: fileGuid ? fileGuid:file,
          },
          headers: { "Content-Type": "application/json" },
        }
        
      );
      console.log(response)
      const data = response.data;
       console.log(data,"data")
       
      // debugger
      if (data.isSuccess) {
        setBeginingOfTheChunk(endOfTheChunk);
        setEndOfTheChunk(endOfTheChunk + chunkSize);
        if (counter == chunkCount) {
          // console.log("Process is complete, counter", counter);

          await uploadCompleted();
        } else {
          var percentage = (counter / chunkCount) * 100;
          setProgress(percentage);
        }
      } else {
        props.uploadError(data.error)
        console.log("Error Occurred:", data.errorMessage);
      }
    } catch (error) {
     props.uploadError( error.message )
      console.log("error", error);
    }
  };

  const uploadCompleted = async () => {
    var formData = new FormData();
    console.log(fileGuid, "File name")
    formData.append("fileName", fileGuid);

    const response = await axios.post(
      'http://79a862d240df.ngrok.io/UploadComplete',
      {},
      {
        params: {
          fileName: fileGuid,
          count:counter,
        },
        data: formData,
      }
    );
    console.log(response)
    const data = response.data;
    // console.log("Complete")
    if (data.isSuccess) {
      setProgress(0);
      setShowProgress(false)
      props.zipFileUpload(fileGuid , [fileToBeUpload])
    }
  };

  const resetChunkProperties = () => {
    props.FileError("")
    setShowProgress(true)
    setProgress(0)
    setCounter(1)
    setBeginingOfTheChunk(0)
    setEndOfTheChunk(chunkSize)
  }
  const activeStyle = {
    backgroundColor: "#79B3C6",
  };
  let {
    getRootProps,
    getInputProps,
    open,
    acceptedFiles,
    fileRejections,
    isChunkUploadActive,
    isChunkUploadAccept,
    isChunkUploadReject,
  } = useDropzone({
    // Disable click and keydown behavior
    noClick: true,
    noKeyboard: true,
    onDrop,
    onDropRejected,
    multiple: true,
    accept: ".jpeg,.jpg,.png,.dcm,.dicom,.zip,.mp3,.mp4",
    maxSize: 1073741824,
  });
  const chunkSize = 1048576 * 3;
  const [showProgress, setShowProgress] = useState(false);
  const [counter, setCounter] = useState(1);
  const [fileToBeUpload, setFileToBeUpload] = useState({});

  const [beginingOfTheChunk, setBeginingOfTheChunk] = useState(0);
  const [endOfTheChunk, setEndOfTheChunk] = useState(chunkSize);
  const [progress, setProgress] = useState(0);
  const [fileGuid, setFileGuid] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  
  useEffect(() => {
    if (fileSize > 0) {
      fileUpload(counter);
    }
    // console.log("fileGuid",fileGuid)
  }, [fileToBeUpload, progress ])

  const style = useMemo(
    () => ({
      ...(isChunkUploadActive ? activeStyle : {}),
    }),
    [isChunkUploadActive, isChunkUploadReject, isChunkUploadAccept]
  );

  const formatBytes = (bytes, decimals = 2) =>{
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const files = acceptedFiles.map((file, index) =>(
        <li key={file.path}>
          <span>
            {file.path} - {formatBytes(file.size)}
          </span>{" "}
          <IconButton
            onClick={(e) => {
              acceptedFiles.splice(acceptedFiles.indexOf(file), 1);
              props.removeFile(file);
              console.log(acceptedFiles)
            }}
          >
            <CloseIcon />
          </IconButton>
        </li>
      ) 
    );

  const progressInstance =<ProgressBar now={progress} label={`${progress.toFixed(3)}%`} />;

  return (
    <div className="container">
      <div {...getRootProps({ className: "dropzone", style })}>
        <input {...getInputProps()} accept=".jpeg,.jpg,.png,.dcm,.dicom,.zip,.mp3,.mp4" />
        <CloudUploadIcon />
        <p>Drag & Drop file here</p>
        <p>or</p>
        <Button onClick={()=>open()} disabled={showProgress}>Browse File</Button>
        {files.length && !props.removeAllFile && !showProgress? (
          <div className="fileContainer">
            <ul>{files}</ul>
          </div>
        ) : (
          ""
        )}
        <div style={{display: showProgress ? "block" : "none" }} className="progressStyle">
          {progressInstance}
        </div>
      </div>
    </div>
  );
}

class ChunkUpload extends Component {
    constructor(props) {
        super(props);
        this.state = {
          loading: false,
          open: false,
          severity: "",
          alertmsg: "",
          siteOptions: [],
          files: "",
          errors: {},
          errorMessages: {},
          isFileUpload: false,
          rescanmodal: false,
          uploading: false,
          fileCount: 0,
          showProgress:false,
          counter:1,
          fileToBeUpload:{},
          // beginingOfTheChunk:0,
          // endOfTheChunk:this.chunkSize,
          progress:0,
          fileGuid:"",
          fileSize :0 ,
          chunkCount : 0
        }; 
    }

    openDropZone = (items) => {
        return (
          <div className="UploadCt">
            <Dropzone
              fileData={(file, error) => this.fileData(file, items, error)}
              removeAllFile={!this.state.files.length}
              FileError={(err) => this.fileError(err)}
              removeFile={(file) => this.removeFile(file)}
              zipFileUpload={(zipFileName , files)=>this.setState({ filename:[{ uploadedFilename: zipFileName, file: files[0] }] , files })}
              uploadError={(error)=>this.setState({
                open: true,
                severity: "error",
                alertmsg: error,
                loading: false,
                isFileUpload: false,
                saveButtonDisabled: false,
                timer: 3000,
              })}
            />
            {this.state.fileErrorMsg ? (
              <FormHelperText>{this.state.fileErrorMsg}</FormHelperText>
            ) : (
              ""
            )}
          </div>
        );
    };

    fileError = (err) => {
        this.setState({ fileErrorMsg: err });
    };

    removeFile = (file) => {
        let { filename, files } = this.state;
        filename = filename.filter((item) => item.file.name !== file.name);
        files = files.filter((item) => item.name !== file.name);
        // console.log(filename,"Filename")
        if (files && !files.length)
          this.fileError("A file is mandatory.");
        this.setState({ filename});
    };

    fileData = (file, formData, error) => {
        let noErrors = true;
        this.setState(
          {
            // errors,
            // errorMessages,
            files: file,
            fileErrorMsg: error ? error : "",
            saveButtonDisabled: error,
            uploading: error,
          },
          () => {
            if (noErrors) this.handleFileUpload();
          }
        );
    };
 
    cancelFileUpload = (e) => {
        controller.abort();
        this.setState((prevState) => {
          return { files: [], filename: null, saveButtonDisabled: false };
        });
      };

    render(){
        return(
            <div className="uploadCT">
                <div className="UploadForm">
                
                {this.state.open ? (
                <SnackBarComponent
                    severity={this.state.severity}
                    open={this.state.open}
                    alertmsg={this.state.alertmsg}
                    timer={this.state.timer}
                    handleClose={this.handleSnackBarClose}
                    className="addUserSnackBar"
                />
                ) : (
                ""
                )}
                <h2>Upload Files</h2>
                    <div className="formComponent">
                        {
                            this.openDropZone()
                        }
                    </div>
                
                </div>
                
            </div>


        )
    }
}

export default ChunkUpload;