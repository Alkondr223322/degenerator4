import {Button} from "react-bootstrap";
import { InputGroup } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import React, { useEffect, useState } from 'react';
import userReduceBalance from "../API/userReduceBalance";
import { jwtDecode } from "jwt-decode";
import etro from "etro";

import MyGeneratorsAccordion from "./MyGeneratorsAccordion";
import genText from "../API/genText";
import genSpeech from "../API/genSpeech";
import genImages from "../API/genImages";
import genMusic from "../API/genMusic";
import { useTranslation} from "react-i18next";
import composeMusic from "../middleware/composeMusic";
import blobToBase64 from "../middleware/blobToBase64";
import b64toBlob from "../middleware/b64toBlob";

function MyGeneratorWrapper(props) { 
    const { t } = useTranslation();
    const [projectName, setprojectName] = useState('New Project'); 
    const [topic, setTopic] = useState(''); 
    const [videoDuration, setvideoDuration] = useState(10); 
    const [imageCount, setimageCount] = useState(5); 
    const [genBlocked, setgenBlocked] = useState(false); 

    const [videoX, setvideoX] = useState(1080); 
    const [videoY, setvideoY] = useState(1920); 

    const [textPrompt, setTextPrompt] = useState(`
Write text for a short-form video with a single narrator telling an interesting fact on the topic of [topic], the text mustn't be longer than 4 sentences long, and your response should contain only what the narrator says`);
    const [imagesPrompt, setImagesPrompt] = useState(`
Background images suitable for a short-form video on the topic of [topic]`);
    const [musicPrompt, setMusicPrompt] = useState(`
Background music suitable for a short-form video on the topic of [topic]`);

    const [needMusic, setneedMusic] = useState(true); 
    const [needTTSMale, setneedTTSMale] = useState(true);
    const [needTTSFemale, setneedTTSFemale] = useState(false);
    const [needImages, setneedImages] = useState(true); 
    const [needText, setneedText] = useState(true); 

    const [videoText, setvideoText] = useState('');
    const [textLayerArr, settextLayerArr] = useState([])
    const [textSettings, settextSettings] = useState({
        startTime: 0,
        duration: videoDuration,
        text: 'Hello World',
        x: 0, // default: 0
        y: 0, // default: 0
        width: 1080, // default: null (full width)
        height: 1920, // default: null (full height)
        opacity: 1, // default: 1
        color: etro.parseColor('white'), // default: new etro.Color(0, 0, 0, 1)
        font: '10px sans-serif', // default: '10px sans-serif'
        textX: videoX/2, // default: 0
        textY: videoY*0.75, // default: 0
        textAlign: 'left', // default: 'left'
        textBaseline: 'alphabetic', // default: 'alphabetic'
        textDirection: 'ltr', // default: 'ltr'
        textStroke: { // default: null (no stroke)
            color: etro.parseColor('black'),
            thickness: 2, // default: 1
        }
    })

    const [musicFile, setMusicFile] = useState('');
    const [musicLayerArr, setmusicLayerArr] = useState([])
    const [musicSettings, setmusicSettings] = useState({
        startTime: 0,
        duration: videoDuration,
        source: '',
        sourceStartTime: 0, // default: 0
        muted: false, // default: false
        volume: 1, // default: 1
        playbackRate: 1, // default: 1
        bassIns: 'Synth',
        melodyIns: 'Synth',
        chordsIns: 'Synth',
        bassArr: [],
        melodyArr: [],
        chordsArr: [],
    })

    const [speechFile, setspeechFile] = useState('');
    const [speechLayerArr, setspeechLayerArr] = useState([])
    const [speechSettings, setspeechSettings] = useState({
        startTime: 0,
        duration: videoDuration,
        source: '',
        sourceStartTime: 0, // default: 0
        muted: false, // default: false
        volume: 1, // default: 1
        playbackRate: 1, // default: 1
    })

    const [imagesArray, setimagesArray] = useState([]);
    const [imageLayerArr, setimageLayerArr] = useState([])
    const [imageSettings, setimageSettings] = useState({
        startTime: 0,
        duration: videoDuration,
        source: '',
        sourceX: 0, // default: 0
        sourceY: 0, // default: 0
        sourceWidth: videoX, // default: null (full width)
        sourceHeight: videoY, // default: null (full height)
        x: 0, // default: 0
        y: 0, // default: 0
        width: videoX, // default: null (full width)
        height: videoY, // default: null (full height)
        opacity: 1, // default: 1
    })
    const [smoothTransition, setsmoothTransition] = useState(true);

    async function generateContent(){
        setgenBlocked(true)


        console.log(topic)
        let balanceRes;
        if(props.token === ''){
            props.handleShowLogin()
            setgenBlocked(false)
            return
        }

        // if (needImages && +imageCount+imagesArray.length > 10 && !window.confirm("You are about to generate more images than a video can handle.\n Are you sure you want to proceed?")) {
        //     setgenBlocked(false)
        //     return
        // }

        // let price = (props.basePrice + (needImages ? props.imagePrice * imageCount : 0) + (needMusic ? props.musicPrice * videoDuration : 0)).toFixed(2)
        let price = (
            (needText ? props.basePrice : 0) + 
            (needMusic ? props.basePrice : 0) + 
            ((needTTSFemale || needTTSMale) ? props.basePrice : 0) + 
            (needImages ? props.imagePrice * imageCount + props.basePrice: 0)
        ).toFixed(2)
        if(props.balance < price){
            props.handleShowPayment()
            setgenBlocked(false)
            return
        }

        let textGenRes = videoText
        if(needText){
            textGenRes = await genText(topic, textPrompt)
            if(!textGenRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
    
            setvideoText(textGenRes)
            balanceRes = await userReduceBalance(props.basePrice, jwtDecode(props.token).userId)
            if(balanceRes){
                props.setBalance(balanceRes)
            }
        }


        if(needTTSFemale){
            let speechGenRes = await genSpeech(textGenRes, 'Female')
            if(!speechGenRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
    
            setspeechFile(speechGenRes)
            balanceRes = await userReduceBalance(props.basePrice, jwtDecode(props.token).userId)
            if(balanceRes){
                props.setBalance(balanceRes)
            }
        }else if(needTTSMale){
            let speechGenRes = await genSpeech(textGenRes, 'Male')
            if(!speechGenRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
    
            setspeechFile(speechGenRes)
            balanceRes = await userReduceBalance(props.basePrice, jwtDecode(props.token).userId)
            if(balanceRes){
                props.setBalance(balanceRes)
            }
        }

        
        if(needMusic){
            let musicGenRes = await genMusic(topic, musicPrompt)
            if(!musicGenRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
            setmusicSettings({...musicSettings, bassArr: musicGenRes[0], melodyArr: musicGenRes[1], chordsArr: musicGenRes[2]})
            //setMusicFile(musicGenRes)
            let composeRes = await composeMusic(musicSettings.bassIns, musicSettings.melodyIns, musicSettings.chordsIns, musicGenRes[0], musicGenRes[1], musicGenRes[2])
            if(!composeRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
            setMusicFile(composeRes)
            balanceRes = await userReduceBalance(props.basePrice, jwtDecode(props.token).userId)
            if(balanceRes){
                props.setBalance(balanceRes)
            }
        }


        if(needImages){
            let imageGenRes = await genImages(topic, imagesPrompt, imageCount, videoDuration)
            if(!imageGenRes){
                alert('Something went wrong, funds for this portion of generation will not be taken, generation aborted')
                setgenBlocked(false)
                return
            }
            setimagesArray([...imagesArray, ...imageGenRes])
            balanceRes = await userReduceBalance(props.imagePrice * imageCount + props.basePrice, jwtDecode(props.token).userId)
            if(balanceRes){
                props.setBalance(balanceRes)
            }
        }
        setgenBlocked(false)
    }

    useEffect(()=>{
        if(needTTSMale){setneedTTSFemale(false)}
    }, [needTTSMale])
    useEffect(()=>{
        if(needTTSFemale){setneedTTSMale(false)}
    }, [needTTSFemale])






    function readTextFile(file){
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsText(file)
          });

    }

    async function exportProject(){
        setgenBlocked(true)
        let projObj = {}
        projObj.projectName = projectName
        projObj.topic = topic
        projObj.videoDuration = videoDuration
        projObj.imageCount = imageCount
        projObj.videoX = videoX
        projObj.videoY = videoY
        projObj.textPrompt = textPrompt
        projObj.imagesPrompt = imagesPrompt
        projObj.musicPrompt = musicPrompt

        projObj.needImages = needImages
        projObj.needText = needText
        projObj.needMusic = needMusic
        projObj.needTTSMale = needTTSMale
        projObj.needTTSFemale = needTTSFemale

        projObj.smoothTransition = smoothTransition
        projObj.videoText = videoText
        projObj.textSettings = textSettings

        projObj.musicSettings = musicSettings

        projObj.speechSettings = speechSettings

        projObj.imageSettings = imageSettings

        if(musicFile !== ''){
            let musicblob = await fetch(musicFile).then(r => r.blob())
            let music64 = await blobToBase64(musicblob)
            //console.log(music64)
            projObj.musicFile = music64
        }else{
            projObj.musicFile = ''
        }
        
        if(speechFile !== ''){
            let speechBlob = await fetch(speechFile).then(r => r.blob())
            let speech64 = await blobToBase64(speechBlob)
            //console.log(speech64)
            projObj.speechFile = speech64
        }else{
            projObj.speechFile = ''
        }

        let exportImgArr = []

        for(let i = 0; i < imagesArray.length; i++){
            let exportImgObj = {}
            exportImgObj.startAt = imagesArray[i].startAt
            exportImgObj.endAt = imagesArray[i].endAt
            exportImgObj.index = imagesArray[i].index
            
            let imageBlob = imagesArray[i].file
            let image64 = await blobToBase64(imageBlob)
            //console.log(image64)
            exportImgObj.file = image64
            exportImgArr.push(exportImgObj)
        }

        projObj.imagesArray = exportImgArr

        console.log(projObj)
        var a = document.createElement("a");
        var file = new Blob([JSON.stringify(projObj)], {type: 'application/json'});
        a.href = URL.createObjectURL(file);
        a.download = projectName;
        a.click();
        // if(imagesArray.length > 0){
        //     let speechBlob = await fetch(speechFile).then(r => r.blob())
        //     let speech64 = await blobToBase64(speechBlob)
        //     console.log(speech64)
        //     projObj.speechFile = speech64
        // }else{
        //     projObj.speechFile = ''
        // }
        
        setgenBlocked(false)
    }

    async function importProject(projFile){
        //console.log(projFile)
        let contents = await readTextFile(projFile)
        //console.log(contents)
        let projObj = JSON.parse(contents)
        setgenBlocked(true)

        setTopic(projObj.topic)
        setvideoDuration(projObj.videoDuration)
        setimageCount(projObj.imageCount)
        setvideoX(projObj.videoX)
        setvideoY(projObj.videoY)
        setTextPrompt(projObj.textPrompt)
        setImagesPrompt(projObj.imagesPrompt)
        setMusicPrompt(projObj.musicPrompt)
        setprojectName(projObj.projectName)


        setneedImages(projObj.needImages)
        setneedText(projObj.needText)
        setneedMusic(projObj.needMusic)
        setneedTTSMale(projObj.needTTSMale)
        setneedTTSFemale(projObj.needTTSFemale)

        setsmoothTransition(projObj.smoothTransition)
        setvideoText(projObj.videoText)
        settextSettings(projObj.textSettings)
        setmusicSettings(projObj.musicSettings)
        setspeechSettings(projObj.speechSettings)
        setimageSettings(projObj.imageSettings)

        if(projObj.musicFile !== ''){
            const musicBlob = b64toBlob(projObj.musicFile);
            const musicBlobURL = URL.createObjectURL(musicBlob);
            setMusicFile(musicBlobURL)
        }

        if(projObj.speechFile !== ''){
            const speechBlob = b64toBlob(projObj.speechFile);
            const speechBlobURL = URL.createObjectURL(speechBlob);
            setspeechFile(speechBlobURL)
        }

        let importImgArr = []
        for(let i = 0; i < projObj.imagesArray.length; i++){
            let importImgObj = {}
            importImgObj.startAt = projObj.imagesArray[i].startAt
            importImgObj.endAt = projObj.imagesArray[i].endAt
            importImgObj.index = projObj.imagesArray[i].index
            
            let imageb64 = projObj.imagesArray[i].file
            const imageBlob = b64toBlob(imageb64)
            let imageFile = new File([imageBlob], 'image', {type: imageBlob.type})
            //console.log(image64)
            importImgObj.file = imageFile
            importImgArr.push(importImgObj)
        }
        setimagesArray([...importImgArr])

        setgenBlocked(false)

    }

    return (
        <div className="d-grid gap-3 border ">
            {/* <Button onClick={()=>console.log(textSettings)}>dasdasdda</Button> */}
    <InputGroup className="my-3 p-2 ">
        <InputGroup.Text id="basic-addon1" style={{minWidth: "50%"}}>{t('Project name:')} </InputGroup.Text>
        <Form.Control
            style={{minWidth: "50%"}}
            aria-label="project name"
            aria-describedby="basic-addon1"
            value={projectName}
            onChange={(e) => {setprojectName(e.target.value);}}
            disabled={genBlocked}
        />
        
        <Button variant="dark" onClick={exportProject} disabled={genBlocked} style={{minWidth: "50%"}}>{t('Export project')} </Button>
        <Button variant="dark" disabled={genBlocked} id="inputGroupFileAddon03" style={{minWidth: "50%"}} onClick={()=>{
            let fileinput = document.getElementById('inputGroupFile03')
            fileinput.click()
        }}> {t('Import project')}</Button>
        <Form.Control type="file" hidden id="inputGroupFile03" ria-describedby="inputGroupFileAddon03" aria-label="Upload" accept="application/json" disabled={genBlocked} onChange={(e)=>{
            if (e.target.files[0]) {
             console.log(e.target.files[0])

             let filet = e.target.files[0].type
             console.log(filet)
             if(filet === 'application/json'){
                //console.log('good')
                importProject(e.target.files[0])
             }
             let imageInput = document.getElementById('inputGroupFile03')
             imageInput.value = null

            }
          }}/>
    </InputGroup>
    
    <InputGroup className="mb-3 p-2 ">
        <InputGroup.Text id="basic-addon1">{t('Video topic:')} </InputGroup.Text>
        <Form.Control
            aria-label="video text"
            aria-describedby="basic-addon1"
            value={topic}
            onChange={(e) => {setTopic(e.target.value);}}
            disabled={genBlocked}
        />
    </InputGroup>
    <InputGroup className="mb-3 p-2 ">
        <Form.Label>{t('Video duration:')} {videoDuration} {t('seconds')}</Form.Label>
        <Form.Range min={10} max={60} value={videoDuration} onChange={(e)=>setvideoDuration(e.target.value)} disabled={genBlocked}/>
    </InputGroup>
    <InputGroup className="mb-3 p-2 ">
        <Form.Label>{t('Amount of images to generate:')} {imageCount}</Form.Label>
        <Form.Range min={1} max={10} value={imageCount} onChange={(e)=>setimageCount(e.target.value)} disabled={genBlocked}/>
    </InputGroup>

    <InputGroup className="mb-3 p-2 d-flex justify-content-between">
    <Form.Check  className="me-3" 
            type="switch"
            id="custom-switch-TTS"
            label={t("Generate text")}
            onChange={(e)=>{setneedText(e.target.checked)}}
            disabled={genBlocked}
            checked={needText}
        />
    <Form.Check  className="me-3" 
            type="switch"
            id="custom-switch-TTS"
            label={t("Generate images")}
            onChange={(e)=>{setneedImages(e.target.checked)}}
            disabled={genBlocked}
            checked={needImages}
        />
        <Form.Check className="me-3"
            type="switch"
            id="custom-switch-music"
            label={t("Generate music")}
            checked={needMusic}
            onChange={(e)=>{setneedMusic(e.target.checked)}}
            disabled={genBlocked}
        />
    <Form.Check  className="me-3" 
            type="switch"
            id="custom-switch-TTS"
            label={t("Generate TTS male voice")}
            onChange={(e)=>{setneedTTSMale(e.target.checked)}}
            disabled={genBlocked}
            checked={needTTSMale}
        />
    <Form.Check  className="me-3" 
            type="switch"
            id="custom-switch-TTS"
            label={t("Generate TTS female voice")}
            onChange={(e)=>{setneedTTSFemale(e.target.checked)}}
            disabled={genBlocked}
            checked={needTTSFemale}
        />
    </InputGroup>


    <MyGeneratorsAccordion videoText={videoText} setvideoText={setvideoText} 
        textLayerArr={textLayerArr} settextLayerArr={settextLayerArr} textSettings={textSettings} settextSettings = {settextSettings}
        videoX={videoX} videoY={videoY} videoDuration={videoDuration}
        musicFile={musicFile} setMusicFile={setMusicFile} musicLayerArr={musicLayerArr} setmusicLayerArr={setmusicLayerArr} musicSettings={musicSettings} setmusicSettings={setmusicSettings}
        speechFile={speechFile} setspeechFile={setspeechFile} speechLayerArr={speechLayerArr} setspeechLayerArr={setspeechLayerArr} speechSettings={speechSettings} setspeechSettings={setspeechSettings}
        imagesArray={imagesArray} setimagesArray={setimagesArray} imageLayerArr={imageLayerArr} setimageLayerArr={setimageLayerArr} imageSettings={imageSettings} setimageSettings={setimageSettings}
        smoothTransition = {smoothTransition} setsmoothTransition = {setsmoothTransition} genBlocked={genBlocked} projectName={projectName}
        textPrompt={textPrompt} setTextPrompt={setTextPrompt} imagesPrompt={imagesPrompt} setImagesPrompt={setImagesPrompt} musicPrompt={musicPrompt} setMusicPrompt={setMusicPrompt}
        />
    <Button className="mb-3 p-2" variant="dark" onClick={generateContent} disabled={genBlocked}>
              {/* {t('Generate content:')} {(props.basePrice + (needImages ? props.imagePrice * imageCount : 0) + (needMusic ? props.musicPrice * videoDuration : 0)).toFixed(2)}$ */}
              {t('Generate content:')} {(
                (needText ? props.basePrice : 0) + 
                (needMusic ? props.basePrice : 0) + 
                ((needTTSFemale || needTTSMale) ? props.basePrice : 0) + 
                (needImages ? props.imagePrice * imageCount + props.basePrice: 0)
            ).toFixed(2)}$
    </Button>  
    </div>
  );
}

export default MyGeneratorWrapper;