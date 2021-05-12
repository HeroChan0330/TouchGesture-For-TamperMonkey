// ==UserScript==
// @name         触摸屏视频优化
// @namespace    https://github.com/HeroChan0330
// @version      2.05
// @description  触摸屏视频播放手势支持，上下滑调整音量，左右滑调整进度
// @author       HeroChanSysu
// @match        https://*/*
// @match        http://*/*
// @match        ftp://*/*
// @grant        GM_addStyle
// ==/UserScript==

var TouchGesture={forbidScroll:false};
var TouchGestureWhiteList={
    "www.bilibili.com":{
        "bilibili-player-video":"bilibili-player-area",
        forbidScrollList:["bilibili-player-dm-tip-wrap"]
    },
    "weibo.com":{
        forbidScrollList:["wbpv-tech","wbpv-open-layer-button"]
    },
    "www.youtube.com":{
        "html5-video-container":"ytd-player",
        forbidScrollList:["video-stream"]
    },
    "m.youtube.com":{
        "html5-video-container":"player-container",
        forbidScrollList:["animation-enabled"]
    }
};
var TouchGestureBlackList=[
    "v.qq.com"
];

var forbidScrollList=[];

TouchGesture.VideoGesture=function(videoElement){
    this.touchDownPt=null;
    this.touchStartPt=null;

    this.sweepDir=0; //0:no sweep 1:up 2:down 3:left 4:right
    this.startTouchVideoTime;
    this.startTouchVideoVolume;
    this.touchResult=0;
    //this.bodyPosition="";
    this.videoBrightness=1;
    this.startTouchBrightness=1;
    
    this._videoElement=videoElement;//对象video标签
    this._elementFrame=null;//文字显示的框架
    this._toastText=null; //文字显示
    this._containElement=null; //_elementFrame的父级
    this._eventListenElement=null;//监听触摸动作的元素

    this._fullScreenNow=tg_IsFullscreen();
    // console.log("_fullScreenNow:"+this._fullScreenNow);

    // console.log(TouchGestureWhiteList);
    // console.log(TouchGestureWhiteList["www.bilibili.com"]!=null);
    this.createDom();
    this.findBestRoot();
    this.applyDom();
};

TouchGesture.VideoGesture.prototype.createDom=function(parentElement){

    var toastDiv=document.createElement("div");
    var toastText=document.createElement("span");
    toastDiv.appendChild(toastText);
    toastDiv.classList.add("TouchGesture_Toast");
    toastText.classList.add("TouchGesture_ToastText");
    
    toastDiv.style.display="none";

    this._elementFrame=toastDiv;
    this._toastText=toastText;

    this._elementFrame.classList.add("TouchGestureForbidScroll");
    this._toastText.classList.add("TouchGestureForbidScroll");


    this._touchStartHandler=this.onTouchStart.bind(this);
    this._touchEndHandler=this.onTouchEnd.bind(this);
    this._touchMoveHandler=this.onTouchMove.bind(this);
    this._windowResizeHandeler=this.fullScreenDetect.bind(this);
    window.addEventListener("resize",this._windowResizeHandeler);
};

TouchGesture.VideoGesture.prototype.findBestRoot=function(){
    var self=this;
    var targetElement=this._videoElement;
    var hostDomain=window.location.host;
    var defaultSetting=TouchGestureWhiteList[hostDomain];
    var defaultSettingSuccess=false;
    if(defaultSetting!=null){
        // console.log("defaultSetting!=null");
        var parentElement=this._videoElement.parentElement;
        // console.log(parentElement);
        var inList=false;
        var targetFrameClass="";
        //vertify whether the video parentelement`s classname is in the whitelist
        parentElement.classList.forEach(element => {
            if(defaultSetting[element]!=null){
                targetFrameClass=defaultSetting[element];
                inList=true;
                // console.log(targetFrameClass+" INLIST");

                // break;
                return;
            }
        });
        if(inList==true){
            var finded=false;
            var temp=parentElement;
            while(finded==false){
                if(temp.classList.contains(targetFrameClass)){
                    finded=true;
                    defaultSettingSuccess=true;
                    self._containElement=temp;
                    self._eventListenElement=temp;
                    break;
                    // console.log("FIND");
                }
                temp=temp.parentElement;
                if(temp.tagName.toLowerCase()=="body"){
                    break;
                }
            }
        }
    }

    if(defaultSettingSuccess==false){
        if(this._fullScreenNow==false){
            targetElement=targetElement.parentElement;
            var topest=false;
            while(!topest){
                // targetElement.classList.add("TouchGestureForbidScroll");
                var temp=targetElement.parentElement;
                var size1=targetElement.offsetWidth*targetElement.offsetHeight;
                var size2=temp.offsetWidth*temp.offsetHeight;
                if(temp.offsetWidth>=targetElement.offsetWidth&&temp.offsetHeight>=targetElement.offsetHeight&&size2/size1<=1.2){
                    targetElement=temp;
                }else{
                    topest=true;
                }
                if(temp.tagName.toLowerCase()=="body"){
                    break;
                }
            }
            self._containElement=targetElement;
            self._eventListenElement=targetElement;
        }else{
            // alert("FULLSCREEN!");
            if(document.fullscreenElement!=null){
                self._containElement=document.fullscreenElement;
                self._eventListenElement=document.fullscreenElement;
            }
        }
    }

};

// TouchGesture.findFullScreenRoot=function(){

// };

TouchGesture.VideoGesture.prototype.onTouchStart=function(e){
    if(this._videoElement.src.length<=2){
        return;
    }
    // this.forbidScroll();
    // console.log(e);
    this.setElementLayout();
    // console.log(e);
    if(e.touches.length==1){
        this.touchDownPt=e.touches[0];
    }else{
        this.cancelTouch();
    }
};

TouchGesture.VideoGesture.prototype.onTouchMove=function(e){
    var videoElement=this._videoElement;
    if(this.touchDownPt==null)
        return;
    if(e.touches.length==1){
        var touchPt=e.touches[0];
        delX=touchPt.clientX-this.touchDownPt.clientX;
        delY=touchPt.clientY-this.touchDownPt.clientY;
        if(this.sweepDir==0){
            var radius=Math.sqrt(delX*delX+delY*delY);
            var w=videoElement.offsetWidth,h=videoElement.offsetHeight;
            var judge=Math.sqrt(w*w+h*h)/30;
            if(radius>judge){
                if(Math.abs(delX)>Math.abs(delY)){
                    if(delX>0)
                        this.sweepDir=4;
                    else
                        this.sweepDir=3;
                }else{
                    if(delY>0)
                        this.sweepDir=2;
                    else
                        this.sweepDir=1;

                }
                // console.log("get sweep dir:"+this.sweepDir);
                this.startTouchVideoTime=Math.floor(videoElement.currentTime);
                this.startTouchVideoVolume=videoElement.volume;
                this.startTouchBrightness=this.videoBrightness;
                this.touchStartPt=touchPt;
            }
        }else if(this.sweepDir==3||this.sweepDir==4){
            delX=touchPt.clientX-this.touchStartPt.clientX;
            this.touchResult=Math.floor((delX/videoElement.offsetWidth)*200);
            if(this.touchResult+this.startTouchVideoTime<0)
                this.touchResult=-this.startTouchVideoTime;
            if(this.touchResult+this.startTouchVideoTime>videoElement.duration){
                this.touchResult=Math.floor(videoElement.duration-this.startTouchVideoTime)-1;
            }
            if( (this.sweepDir==3&&this.touchResult>0)||(this.sweepDir==4&&this.touchResult<0)){
                this.touchResult=0;
            }
            if(this.touchResult>0)
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" +"+this.touchResult+"s");
            else
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" "+this.touchResult+"s");
            // console.log(videoElement);
        }else if(this.sweepDir==1||this.sweepDir==2){
            if(this.touchStartPt.clientX<document.body.clientWidth/2){
                delY=touchPt.clientY-this.touchStartPt.clientY;
                var plus=-delY/videoElement.offsetHeight*4;
                this.touchResult=this.startTouchBrightness+plus;
                if(this.touchResult<0) this.touchResult=0;
                else if(this.touchResult>1) this.touchResult=1;
                this.videoBrightness=this.touchResult;
                var realBrightness=Math.sqrt(this.touchResult)*0.85+0.15;
                videoElement.style.filter="brightness("+realBrightness+")";
                this.setToast("Bri:"+Math.floor(this.touchResult*100)+"%");
            }else{
                delY=touchPt.clientY-this.touchStartPt.clientY;
                var plus=-delY/videoElement.offsetHeight*4;
                this.touchResult=this.startTouchVideoVolume+plus;
                if(this.touchResult<0) this.touchResult=0;
                else if(this.touchResult>1) this.touchResult=1;
                videoElement.volume =this.touchResult;
                this.setToast("Vol:"+Math.floor(this.touchResult*100)+"%");
            }
        }

        //console.log("delx:"+delX);
    }else{
        this.cancelTouch();
    }
};


TouchGesture.VideoGesture.prototype.onTouchEnd=function(e){
    videoElement=this._videoElement;
    this.touchDownPt=null;
    if(this.touchResult!=0){
        if(this.sweepDir==3||this.sweepDir==4){
            var res=this.startTouchVideoTime+this.touchResult;
            // console.log(videoElement.currentTime);
            // console.log("touch end:"+res);
            videoElement.currentTime=res;
            this.hideToast();
            // videoElement.play();
        }else if(this.sweepDir==1||this.sweepDir==2){
            this.hideToast();
            // videoElement.play();
        }
    }else{
        this.cancelTouch();
    }
    this.sweepDir=0;
    // this.permitcroll();
};

TouchGesture.VideoGesture.prototype.applyDom=function(videoElement){
    this._containElement.appendChild(this._elementFrame);
    var temp=this._videoElement;
    while(temp!=this._eventListenElement){
        temp.classList.add("TouchGestureForbidScroll");
        temp=temp.parentElement;
    }
    this._eventListenElement.classList.add("TouchGestureForbidScroll");

    this._eventListenElement.addEventListener("touchstart",this._touchStartHandler,false);
    this._eventListenElement.addEventListener("touchend",this._touchEndHandler,false);
    this._eventListenElement.addEventListener("touchmove",this._touchMoveHandler,false);
};


TouchGesture.VideoGesture.prototype.restoreDom=function(){
    this._containElement.appendChild(this._elementFrame);

    var temp=this._videoElement;
    while(temp!=this._eventListenElement){
        temp.classList.remove("TouchGestureForbidScroll");
        temp=temp.parentElement;
    }
    this._eventListenElement.classList.remove("TouchGestureForbidScroll");

    this._eventListenElement.removeEventListener("touchstart",this._touchStartHandler);
    this._eventListenElement.removeEventListener("touchend",this._touchEndHandler);
    this._eventListenElement.removeEventListener("touchmove",this._touchMoveHandler);
};

TouchGesture.VideoGesture.prototype.fullScreenDetect=function(){
    var fullScreenState=tg_IsFullscreen();
    if(fullScreenState!=this._fullScreenNow){
        this._fullScreenNow=fullScreenState;
        this.restoreDom();
        this.findBestRoot();
        this.applyDom();
    }
};

TouchGesture.VideoGesture.prototype.setElementLayout=function(){
    var videoTarget=this._containElement;
    var vw=videoTarget.offsetWidth,vh=videoTarget.offsetHeight;
    var w=vw/5;
    //var h=vh/8;
    var h=w/3;
    var x=(vw-w)/2+videoTarget.offsetLeft;
    var y=(vh-h)/2+videoTarget.offsetTop;
    // console.log("w:"+w," h:"+h+" x:"+x+" y:"+y);
    this._elementFrame.style.width=w+"px";
    this._elementFrame.style.height=h+"px";
    this._elementFrame.style.left=x+"px";
    this._elementFrame.style.top=y+"px";
    // this._element.style.display="block";
    var fontsize=h/3;
    this._toastText.style.fontSize=fontsize+"px";
    this._toastText.style.marginTop=(h-fontsize)/2+"px";
    this._elementFrame.style.display="none";
    this._elementFrame.style.borderRadius = w/10 +"px";
};

TouchGesture.VideoGesture.prototype.setToast=function(str){
    // this._element.style.opacity=0.75;
    this._elementFrame.style.display="block";
    this._elementFrame.classList.remove("fadeout");
    this._toastText.innerHTML=str;
}

TouchGesture.VideoGesture.prototype.cancelTouch=function(){
    this.touchDownPt=null;
    this.hideToast();
}

TouchGesture.VideoGesture.prototype.hideToast=function(){
    var element=this._elementFrame;
    setTimeout(function(){
        element.classList.add("fadeout");
    },500);
    // setTimeout(function(){
    //     element.style.opacity=0;
    //     element.classList.remove("fadeout");
    // },1500);
}

TouchGesture.VideoGesture.insertDom=function(dom){
    var videoTags = dom.getElementsByTagName('video');
    // console.log(dom);
    Array.prototype.forEach.call(videoTags, function(videoTag) {
        if (!videoTag.getAttribute('TouchGesture_Video')) {
          videoTag.setAttribute('TouchGesture_Video', true);
          new TouchGesture.VideoGesture(videoTag);
        //   console.log("insert node");
        }
    });
};

TouchGesture.VideoGesture.insertAll=function(){
    // var self=this;
    TouchGesture.VideoGesture.insertDom(document);

};

// TouchGesture.VideoGesture.prototype.forbidScroll=function(){
//     // var bodies=document.getElementsByTagName("body");
//     // Array.prototype.forEach.call(bodies, function(body) {
//     //     body.style.position="fixed";
//     // });
//     TouchGesture.forbidScroll=true;
// }

// TouchGesture.VideoGesture.prototype.permitcroll=function(){
//     // var bodies=document.getElementsByTagName("body");
//     // Array.prototype.forEach.call(bodies, function(body) {
//     //     body.style.position="relative";
//     // });
//     TouchGesture.forbidScroll=false;
// }

function seconds2TimeStr(secs){
    var hour=parseInt(secs/3600);
    var min=parseInt(secs/60)-60*hour;
    var sec=secs%60;
    var ret="";
    if(hour>0){
        ret+=hour+":";
    }
    ret+=(min < 10? '0' + min : min) + ':' + (sec < 10? '0' + sec : sec);
    return ret;
}

function initForbidScrollList(){
    var hostDomain=window.location.host;
    var defaultSetting=TouchGestureWhiteList[hostDomain];
    if(defaultSetting!=null){
        forbidScrollList=defaultSetting.forbidScrollList;
        // console.log(forbidScrollList);
    }
}

function whetherInBlackList(){
    var hostDomain=window.location.host;
    if(TouchGestureBlackList.indexOf(hostDomain)>=0){
        return true;
    }
    return false;
}
function tg_IsFullscreen(){
    return document.fullscreenElement    ||
           document.msFullscreenElement  ||
           document.mozFullScreenElement ||
           document.webkitFullscreenElement || false;
}

(function() {
    'use strict';
    GM_addStyle('div.TouchGesture_Toast{  width: 200px;  height: 100px;  opacity: 0.75;  position: absolute;  z-index: 999999;  top: 100px;  left: 200px;  background-color: black; pointer-events:none;} ');
    GM_addStyle('span.TouchGesture_ToastText{  position: absolute;  left: 0;  right: 0;  text-align: center;  color: white; pointer-events:none;}');
    GM_addStyle('div.TouchGesture_Toast.fadeout{  -webkit-transition: all 1.5s; -moz-transition: all 1.5s; -ms-transition: all 1.5s; -o-transition: all 1.5s; transition: all 1.5s; opacity: 0;}');
    if(whetherInBlackList()){
        return;
    }
    initForbidScrollList();
    document.addEventListener('touchstart',function(e){
        // console.log(e);
        // if(e.srcElement.tagName!="VIDEO"
        //     &&forbidScrollList.indexOf(e.srcElement.classList[0])<0
        //     &&!e.srcElement.classList.contains("TouchGestureForbidScroll")){
        //     TouchGesture.forbidScroll=false;
        // }else{
        //     document.addEventListener('touchmove',preventDefault,{passive:false});
        // }
        if(forbidScrollList.indexOf(e.srcElement.classList[0])>=0){
            document.addEventListener('touchmove',preventDefault,{passive:false});
        }else{
            var noVideo=true;
            for(var i=0;i<e.path.length;i++){
                var element=e.path[i];
                // console.log(element);
                if(element.tagName=="VIDEO"||(element.classList&&element.classList.contains["TouchGestureForbidScroll"])){
                    // TouchGesture.forbidScroll=true;
                    noVideo=false;
                    break;
                }
            }

            
            if(!noVideo){
                document.addEventListener('touchmove',preventDefault,{passive:false});
            }else if(tg_IsFullscreen()){
                if(e.touches[0].clientX>document.body.clientWidth/8&&e.touches[0].clientX<document.body.clientWidth){
                    document.addEventListener('touchmove',preventDefault,{passive:false});
                }else{
                    // TouchGesture.forbidScroll=false;
                }
            }
            else{
                // TouchGesture.forbidScroll=false;
            }
        }
    });
    function preventDefault(e){
        e.preventDefault();
        return false;
    };
    document.addEventListener('touchend',function(e){
        document.removeEventListener('touchmove',preventDefault);
    });
    // document.addEventListener('touchmove',function(e){
    //     console.log(e.srcElement.classList[0]);
    // });
    TouchGesture.VideoGesture.insertAll();
    setInterval(TouchGesture.VideoGesture.insertAll, 1500);
})();