// ==UserScript==
// @name         触摸屏视频优化
// @namespace    https://github.com/HeroChan0330
// @version      2.10
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
    "m.bilibili.com":{
        forbidScrollList:["player-mobile-display"]
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
        forbidScrollList:["animation-enabled","player-controls-background"]
    },
    "v.youku.com":{
        "youku-film-player":"youku-film-player",
        forbidScrollList:["yk-trigger-layer"]
    },
    "www.facebook.com":{
        forbidScrollList:["i09qtzwb"]
    }

};
var TouchGestureBlackList=[
    "v.qq.com"
];

var forbidScrollList=[];

TouchGesture.VideoGesture=function(videoElement){
    this.touchDownPt=null; //触摸按下时得位置
    this.touchStartPt=null; //顺着一定方向滑动时并触发功能，开始计算的点

    this.sweepDir=0; //0:no sweep 1:up 2:down 3:left 4:right
    this.startTouchVideoTime; 
    this.startTouchVideoVolume;
    this.touchResult=0; //触摸结果暂存
    this.startTouchFingers=0; //在触发功能前触摸点数
    this.originalPlayrate=1; //视频原本的播放速率
    //this.bodyPosition="";
    this.videoBrightness=1;
    this.startTouchBrightness=1;
    this.longTouch=false;

    this._videoSrcStore=null;
    this._videoElement=videoElement;//对象video标签
    this._videoElementAbLeft=0; //video标签相对页面的left
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


    // video内地址更改时，重新设置页面(针对bilibili连续播放)
    var self = this;
    this._videoElement.addEventListener('play', function () { //播放开始执行的函数
        if(self._videoSrcStore == null){
            // alert("first play");
            self._videoSrcStore=self._videoElement.src;

        }else if(self._videoElement.src!=self._videoSrcStore){
            // alert("replay");
            self.restoreDom();
            self.findBestRoot();
            self.applyDom();
        }
    });
};

// 产生显示元素
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
    window.addEventListener("resize",this._windowResizeHandeler,"false");


};

// 找到显示元素最佳的parent及监听元素
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

TouchGesture.VideoGesture.prototype.simMouseMoveDock=function(){
    if(this.touchDownPt==null)
        return;
    var self=this;
    var event = new MouseEvent('mousemove', {
        view: document.defaultView,
        bubbles: true,
        cancelable: false,
        clientX:self._videoElement.clientWidth/2+Math.floor(Math.random()*20),
        clientY:self._videoElement.clientHeight*1.5
    });
    self._videoElement.dispatchEvent(event);
    setTimeout(() => {
        self.simMouseMoveDock();
    }, 1000);
};


TouchGesture.VideoGesture.prototype.simMouseMoveCenter=function(){
    var self=this;
    var event = new MouseEvent('mousemove', {
        view: document.defaultView,
        bubbles: true,
        cancelable: false,
        clientX:self._videoElement.clientWidth/2,
        clientY:self._videoElement.clientHeight/2
    });
    self._videoElement.dispatchEvent(event);
};

// 触摸开始
TouchGesture.VideoGesture.prototype.onTouchStart=function(e){
    if(this._videoElement.src.length<=2){
        // 视频的src长度太低，视频基本无效。
        return;
    }
    if(this.sweepDir!=0){
        // 当滑动一定距离后，不再响应touchdown
        if(e.touches.length!=this.startTouchFingers){
            // 触摸点数变化，取消当前的触摸结果
            this.cancelTouch();
        }
        return;
    }
    // this.forbidScroll();
    // console.log(e);
    this.setElementLayout();
    // console.log(e);
    this.startTouchFingers=e.touches.length;
    if(this.startTouchFingers>0){
        if(this.startTouchFingers==2){
            var dis=Math.sqrt((e.touches[0].clientX-e.touches[1].clientX)*(e.touches[0].clientX-e.touches[1].clientX)+(e.touches[0].clientY-e.touches[1].clientY)*(e.touches[0].clientY-e.touches[1].clientY));
            var longside = (document.body.clientWidth>document.body.clientHeight)?document.body.clientWidth:document.body.clientHeight;
            if(dis>longside/4){
                // 两个触摸到相隔太远，取消触摸结果
                this.touchDownPt=null;
                this.startTouchFingers=0;
                this.cancelTouch();
                return;
            }else{
                // 记录原本的播放速率，并且2倍速播放
                this.originalPlayrate=this._videoElement.playbackRate;
                this._videoElement.playbackRate=4.0;
                this.setToast("4倍速播放");
            }
        }
        else if(this.startTouchFingers==1){
            var self = this;
            setTimeout(() => {
                if(self.touchDownPt != null && self.touchResult==0 && self.startTouchFingers==1){
                    var str = seconds2TimeStr(Math.floor(self._videoElement.currentTime)) + " / " + seconds2TimeStr(Math.floor(self._videoElement.duration));
                    self.setToast(str);
                    self.simMouseMoveDock();
                    self.longTouch=true;
                }
            }, 500);
        }
        this.touchDownPt=e.touches[0];

        var ableft=this._videoElement.offsetLeft;
        var temp=this._videoElement.offsetParent;
        while(temp!=null){
            ableft+=temp.offsetLeft;
            temp=temp.offsetParent;
        }
        this._videoElementAbLeft=ableft;
        // console.log("ableft:"+ableft);
    
    }else{
        this.cancelTouch();
    }
};

TouchGesture.VideoGesture.prototype.onTouchMove=function(e){
    // console.log(e);
    var videoElement=this._videoElement;
    if(this.touchDownPt==null)
        return;
    // if(e.touches.length!=this.startTouchFingers){
    //     this.cancelTouch();
    //     return;
    // }
    if(this.startTouchFingers==1){
        // 单个手指触摸
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
            var delXRatio=delX/videoElement.offsetWidth;
            if(Math.abs(delXRatio)<0.5){
                this.touchResult=Math.floor(delXRatio*180);
            }else{
                if(delXRatio>0)
                    this.touchResult=Math.floor((Math.pow(100,delXRatio-0.5)-1)*180+90);
                else
                this.touchResult=Math.floor(-(Math.pow(100,-delXRatio-0.5)-1)*180-90);
                //this.touchResult=Math.floor(Math.pow(2*delX/videoElement.offsetWidth,3)*120);
            }
            if(this.touchResult+this.startTouchVideoTime<0)
                this.touchResult=-this.startTouchVideoTime;
            if(this.touchResult+this.startTouchVideoTime>videoElement.duration){
                this.touchResult=Math.floor(videoElement.duration-this.startTouchVideoTime)-1;
            }
            if( (this.sweepDir==3&&this.touchResult>0)||(this.sweepDir==4&&this.touchResult<0)){
                this.touchResult=0;
            }
            var offsetValStr;
            if(Math.abs(this.touchResult)<300)
                offsetValStr=this.touchResult+"s";
            else
                offsetValStr=Math.floor(this.touchResult/6)/10+"min";

            if(this.touchResult>0)
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" +"+offsetValStr);
            else
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" "+offsetValStr);
            // console.log(videoElement);
        }else if(this.sweepDir==1||this.sweepDir==2){
            if(this.touchStartPt.clientX-this._videoElementAbLeft<this._videoElement.clientWidth/2){
                delY=touchPt.clientY-this.touchStartPt.clientY;
                var plus=-delY/videoElement.offsetHeight*4;
                this.touchResult=this.startTouchBrightness+plus;
                if(this.touchResult<0) this.touchResult=0;
                else if(this.touchResult>1) this.touchResult=1;
                this.videoBrightness=this.touchResult;
                var realBrightness=Math.sqrt(this.touchResult)*0.85+0.15;
                videoElement.style.filter="brightness("+realBrightness+")";
                this.setToast("亮度:"+Math.floor(this.touchResult*100)+"%");
            }else{
                delY=touchPt.clientY-this.touchStartPt.clientY;
                var plus=-delY/videoElement.offsetHeight*4;
                this.touchResult=this.startTouchVideoVolume+plus;
                if(this.touchResult<0) this.touchResult=0;
                else if(this.touchResult>1) this.touchResult=1;
                videoElement.volume =this.touchResult;
                // if(videoElement.volume!=0)
                //    videoElement.muted=false;
                this.setToast("音量:"+Math.floor(this.touchResult*100)+"%");
            }
        }

        //console.log("delx:"+delX);
    }else if(this.startTouchFingers==2){
        // 2个手指触摸
        var touchPt=e.touches[0];
        delX=touchPt.clientX-this.touchDownPt.clientX;
        delY=touchPt.clientY-this.touchDownPt.clientY;
        if(this.sweepDir==0){
            var radius=Math.sqrt(delX*delX+delY*delY);
            var w=videoElement.offsetWidth,h=videoElement.offsetHeight;
            var judge=Math.sqrt(w*w+h*h)/30;
            if(radius>judge){
                if(Math.abs(delX)>Math.abs(delY)){
                    this._videoElement.playbackRate=this.originalPlayrate;
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
                this.touchStartPt=touchPt;
                
            }
        }else if(this.sweepDir==3||this.sweepDir==4){
            delX=touchPt.clientX-this.touchStartPt.clientX;
            this.touchResult=this.originalPlayrate+Math.floor((delX/videoElement.offsetWidth)*10)*0.25;
            if(this.touchResult>4) this.touchResult=4;
            if(this.touchResult<0.25) this.touchResult=0.25;
            this.setToast("倍速X "+this.touchResult);
        }
    }
};


TouchGesture.VideoGesture.prototype.onTouchEnd=function(e){
    var videoElement=this._videoElement;
    this.touchDownPt=null;
    if(this.touchResult!=0){
        if(this.startTouchFingers==1){
            if(this.sweepDir==3||this.sweepDir==4){
                var res=this.startTouchVideoTime+this.touchResult;
                // console.log(videoElement.currentTime);
                // console.log("touch end:"+res);
                videoElement.currentTime=res;
                // this.hideToast();
                // videoElement.play();
            }else if(this.sweepDir==1||this.sweepDir==2){
                // this.hideToast();
                // videoElement.play();
            }
        }else if(this.startTouchFingers==2){
            if(this.sweepDir==3||this.sweepDir==4){
                this._videoElement.playbackRate=this.touchResult;
                this.originalPlayrate=this.touchResult;
            }
        }
    }else{

    }
    this.sweepDir=0;
    this.touchResult=0;
    this._videoElement.playbackRate=this.originalPlayrate;
    this.hideToast();
    if(this.longTouch==true)
        this.simMouseMoveCenter();
    this.longTouch=false;
    // this.cancelTouch();

    // this.permitcroll();
};

// 启动监听
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

// Resize时恢复元素原样，取消事件监听
TouchGesture.VideoGesture.prototype.restoreDom=function(){
    this._containElement.appendChild(this._elementFrame);

    var temp=this._videoElement;
    while(temp!=this._eventListenElement){
        if(temp.classList!=null)
            temp.classList.remove("TouchGestureForbidScroll");
        temp=temp.parentElement;
        if(temp == null)
            break;
    }
    if(this._eventListenElement==null)
        return;
    this._eventListenElement.classList.remove("TouchGestureForbidScroll");

    this._eventListenElement.removeEventListener("touchstart",this._touchStartHandler);
    this._eventListenElement.removeEventListener("touchend",this._touchEndHandler);
    this._eventListenElement.removeEventListener("touchmove",this._touchMoveHandler);
};

// 窗口resize时检测是否全屏并且适配
TouchGesture.VideoGesture.prototype.fullScreenDetect=function(){
    // alert("resize");
    var fullScreenState=tg_IsFullscreen();
    if(fullScreenState!=this._fullScreenNow){
        this._fullScreenNow=fullScreenState;
        this.restoreDom();
        this.findBestRoot();
        this.applyDom();
        if(fullScreenState == true){
            // console.log("fullscreen");
            this._elementFrame.style.position = "fixed";
            this.simMouseMoveCenter();
            //模拟鼠标移到中间，使得自动隐藏视频底部
        }
        else{
            this._elementFrame.style.position = "absolute";
        }
    }
};

//自动调节DIV元素位置
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

//显示Toast
TouchGesture.VideoGesture.prototype.setToast=function(str){
    // this._element.style.opacity=0.75;
    this._elementFrame.style.display="block";
    this._elementFrame.classList.remove("fadeout");
    this._toastText.innerHTML=str;
}

//在Touchend之前取消手势
TouchGesture.VideoGesture.prototype.cancelTouch=function(){
    this.sweepDir=0;
    this._videoElement.playbackRate=this.originalPlayrate;
    this.touchDownPt=null;
    this.hideToast();
}

// 隐藏toast
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

// 检测<video>并插入元素
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
        if(defaultSetting.forbidScrollList!=null)
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
    return document.fullscreenElement!=null    ||
           document.msFullscreenElement!=null  ||
           document.mozFullScreenElement!=null ||
           document.webkitFullscreenElement!=null ||
           document.fullscreen == true || false;
}

(function() {
    'use strict';
    GM_addStyle('div.TouchGesture_Toast{  width: 200px;  height: 100px;  opacity: 0.75;  position: absolute;  z-index: 2147483648;  top: 100px;  left: 200px;  background-color: black; pointer-events:none;} ');
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