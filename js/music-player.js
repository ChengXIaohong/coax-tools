/*
 * 本地音乐播放器 - 核心功能实现
 *
 * MIT License
 *
 * Copyright (c) 2025 coax
 *
 * 本地音乐播放器，支持多种音频格式，具备播放列表、进度控制、音量调节等功能
 */

// 获取DOM元素
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeControl = document.getElementById('volumeControl');
const audioFilesInput = document.getElementById('audioFiles');
const playlist = document.getElementById('playlist');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const albumArt = document.getElementById('albumArt');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const currentYearSpan = document.getElementById('currentYear');

// 播放列表数据
let playlistItems = [];
let currentTrackIndex = -1;

// 初始化年份
currentYearSpan.textContent = new Date().getFullYear();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定事件监听器
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);
    audioPlayer.addEventListener('loadedmetadata', updateTotalTime);
    audioPlayer.addEventListener('canplay', onCanPlay);
    progressBar.addEventListener('input', seekAudio);
    progressBar.addEventListener('change', seekAudio);
    volumeControl.addEventListener('input', setVolume);
    audioFilesInput.addEventListener('change', handleFileUpload);
    
    // 设置默认音量
    audioPlayer.volume = volumeControl.value;
});

// 当音频可以播放时触发
function onCanPlay() {
    // 音频准备就绪，可以播放
    if (audioPlayer.paused) {
        updatePlayButton(false);
    } else {
        updatePlayButton(true);
    }
}

// 切换播放/暂停
function togglePlayPause() {
    if (audioPlayer.paused) {
        playCurrentTrack();
    } else {
        pauseCurrentTrack();
    }
}

// 播放当前曲目
function playCurrentTrack() {
    if (playlistItems.length === 0) {
        alert('请先上传音乐文件');
        return;
    }
    
    if (currentTrackIndex === -1) {
        currentTrackIndex = 0;
        loadTrack(currentTrackIndex);
    }
    
    audioPlayer.play();
    updatePlayButton(true);
}

// 暂停当前曲目
function pauseCurrentTrack() {
    audioPlayer.pause();
    updatePlayButton(false);
}

// 更新播放按钮状态
function updatePlayButton(isPlaying) {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// 播放上一首
function playPrevious() {
    if (playlistItems.length === 0) return;
    
    currentTrackIndex--;
    if (currentTrackIndex < 0) {
        currentTrackIndex = playlistItems.length - 1;
    }
    
    loadTrack(currentTrackIndex);
    playCurrentTrack();
}

// 播放下一首
function playNext() {
    if (playlistItems.length === 0) return;
    
    currentTrackIndex++;
    if (currentTrackIndex >= playlistItems.length) {
        currentTrackIndex = 0; // 循环播放
    }
    
    loadTrack(currentTrackIndex);
    playCurrentTrack();
}

// 加载指定索引的曲目
function loadTrack(index) {
    if (index < 0 || index >= playlistItems.length) return;
    
    const track = playlistItems[index];
    audioPlayer.src = URL.createObjectURL(track.file);
    
    // 更新曲目信息
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || '未知艺术家';
    
    // 更新播放列表高亮
    updatePlaylistHighlight();
    
    // 重置进度条
    progressBar.value = 0;
    currentTimeEl.textContent = '0:00';
}

// 更新播放列表高亮
function updatePlaylistHighlight() {
    const items = playlist.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 更新进度条
function updateProgress() {
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progressPercent;
        
        // 更新当前时间显示
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
}

// 更新总时间
function updateTotalTime() {
    totalTimeEl.textContent = formatTime(audioPlayer.duration);
}

// 格式化时间（秒转为分:秒）
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// 跳转到指定位置
function seekAudio() {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
}

// 设置音量
function setVolume() {
    audioPlayer.volume = volumeControl.value;
}

// 处理文件上传
function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // 过滤音频文件
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
        alert('请选择音频文件');
        return;
    }
    
    // 添加到播放列表
    audioFiles.forEach(file => {
        // 从文件名解析标题和艺术家信息
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // 去掉扩展名
        const parts = fileName.split(' - ');
        const title = parts.length > 1 ? parts[1] : fileName;
        const artist = parts.length > 1 ? parts[0] : '未知艺术家';
        
        playlistItems.push({
            file: file,
            title: title,
            artist: artist,
            duration: 0 // 将在加载后更新
        });
    });
    
    // 渲染播放列表
    renderPlaylist();
    
    // 如果是第一首歌，自动加载并播放
    if (playlistItems.length > 0 && currentTrackIndex === -1) {
        currentTrackIndex = 0;
        loadTrack(currentTrackIndex);
        playCurrentTrack();
    }
}

// 渲染播放列表
function renderPlaylist() {
    if (playlistItems.length === 0) {
        playlist.innerHTML = '<li class="playlist-item empty-playlist">播放列表为空，请上传音乐文件</li>';
        return;
    }
    
    playlist.innerHTML = '';
    
    playlistItems.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <span class="track-info">${track.title} - ${track.artist}</span>
            <span class="track-duration">--:--</span>
        `;
        
        li.addEventListener('click', () => {
            currentTrackIndex = index;
            loadTrack(currentTrackIndex);
            playCurrentTrack();
        });
        
        playlist.appendChild(li);
    });
}