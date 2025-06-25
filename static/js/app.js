document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('webcam');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    
    // Status elements
    const postureStatus = document.getElementById('postureStatus');
    const eyeContactStatus = document.getElementById('eyeContactStatus');
    const emotionStatus = document.getElementById('emotionStatus');
    const handStatus = document.getElementById('handStatus');
    const improvementList = document.getElementById('improvementList');
    const overallFeedback = document.getElementById('overallFeedback');
    
    // Loader element
    const loader = document.getElementById('loader');
    
    let stream = null;
    let isAnalyzing = false;
    let analysisInterval = null;
    
    // Start webcam
    async function startWebcam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480
                },
                audio: false
            });
            video.srcObject = stream;
            return true;
        } catch (err) {
            console.error('Error accessing webcam:', err);
            alert('Unable to access webcam. Please make sure you have a webcam connected and have granted permission to use it.');
            return false;
        }
    }
    
    // Stop webcam
    function stopWebcam() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            stream = null;
        }
    }
    
    // Helper to show loader
    function showLoader() {
        loader.style.display = 'block';
    }
    
    // Helper to hide loader
    function hideLoader() {
        loader.style.display = 'none';
    }
    
    // Update posture status
    function updatePostureStatus(score) {
        if (score >= 90) {
            postureStatus.textContent = "Excellent! You're sitting perfectly straight.";
            postureStatus.style.color = '#34a853';  // Green
        } else if (score >= 70) {
            postureStatus.textContent = "Good posture, but try to sit a bit straighter.";
            postureStatus.style.color = '#fbbc05';  // Yellow
        } else {
            postureStatus.textContent = "Please sit up straight and align your shoulders.";
            postureStatus.style.color = '#ea4335';  // Red
        }
    }
    
    // Update eye contact status
    function updateEyeContactStatus(score, lookingDirection, facePosition) {
        let message = "";
        let color = '#fbbc05';  // Default yellow
        
        if (!facePosition.is_centered) {
            message = `⚠️ ${facePosition.message}`;
            color = '#ea4335';  // Red
        } else {
            switch(lookingDirection) {
                case 'direct':
                    message = "Excellent eye contact! You're looking directly at the camera.";
                    color = '#34a853';  // Green
                    break;
                case 'looking_left':
                    message = "⚠️ You're looking to your left. Try to look directly at the camera.";
                    color = '#ea4335';  // Red
                    break;
                case 'looking_right':
                    message = "⚠️ You're looking to your right. Try to look directly at the camera.";
                    color = '#ea4335';  // Red
                    break;
                case 'looking_up':
                    message = "⚠️ You're looking up. Try to look directly at the camera.";
                    color = '#ea4335';  // Red
                    break;
                case 'looking_down':
                    message = "⚠️ You're looking down. Try to look directly at the camera.";
                    color = '#ea4335';  // Red
                    break;
                case 'not_detected':
                    message = "Unable to detect eye contact. Please ensure your face is visible.";
                    color = '#ea4335';  // Red
                    break;
                default:
                    message = "Try to maintain direct eye contact with the camera.";
                    color = '#fbbc05';  // Yellow
            }
        }
        
        eyeContactStatus.textContent = message;
        eyeContactStatus.style.color = color;
    }
    
    // Update emotion status
    function updateEmotionStatus(score, emotion, faceDetected) {
        let message = "";
        let color = '#fbbc05';  // Default yellow
        if (!faceDetected) {
            message = "Face not detected";
            color = '#ea4335';
        } else {
            switch(emotion) {
                case 'big smile':
                    message = "Excellent! Your genuine smile shows great confidence and enthusiasm!";
                    color = '#34a853';  // Green
                    break;
                case 'happy':
                    message = "Great! Your smile shows confidence and positivity!";
                    color = '#34a853';  // Green
                    break;
                case 'pleasant':
                    message = "Good! You have a pleasant, approachable expression.";
                    color = '#34a853';  // Green
                    break;
                case 'engaging':
                    message = "You're speaking with good energy and engagement.";
                    color = '#34a853';  // Green
                    break;
                case 'focused':
                    message = "You appear focused and attentive.";
                    color = '#fbbc05';  // Yellow
                    break;
                case 'concerned':
                    message = "Try to relax your expression, you appear a bit tense.";
                    color = '#ea4335';  // Red
                    break;
                case 'negative':
                    message = "Try to maintain a more positive expression.";
                    color = '#ea4335';  // Red
                    break;
                default:
                    message = "Try to be more expressive and show more engagement.";
                    color = '#fbbc05';  // Yellow
            }
        }
        emotionStatus.textContent = message;
        emotionStatus.style.color = color;
    }
    
    // Update hand movement status
    function updateHandStatus(score, movement, isFaceTouching, faceDetected) {
        let message = "";
        let color = '#fbbc05';  // Default yellow
        if (!faceDetected) {
            message = "Face not detected";
            color = '#ea4335';
        } else if (isFaceTouching) {
            message = "⚠️ Avoid touching your face - this can appear nervous or unprofessional.";
            color = '#ea4335';  // Red
        } else {
            switch(movement) {
                case 'expressive':
                    message = "Great natural hand gestures! Keep it up!";
                    color = '#34a853';  // Green
                    break;
                case 'natural':
                    message = "Good hand positioning and movement.";
                    color = '#34a853';  // Green
                    break;
                case 'too high':
                    message = "Lower your hands a bit for more natural gesturing.";
                    color = '#ea4335';  // Red
                    break;
                case 'too low':
                    message = "Raise your hands slightly for better engagement.";
                    color = '#ea4335';  // Red
                    break;
                case 'too wide':
                    message = "Keep your hand movements closer to your body.";
                    color = '#ea4335';  // Red
                    break;
                default:
                    message = "Use natural hand gestures to enhance your communication.";
                    color = '#fbbc05';  // Yellow
            }
        }
        handStatus.textContent = message;
        handStatus.style.color = color;
    }
    
    // Update lighting status
    function updateLightingStatus(lighting) {
        const lightingStatus = document.getElementById('lightingStatus');
        
        if (lighting.status === 'good') {
            lightingStatus.textContent = "Lighting conditions are good.";
            lightingStatus.style.color = '#34a853';  // Green
        } else {
            lightingStatus.textContent = `⚠️ ${lighting.message}`;
            lightingStatus.style.color = '#ea4335';  // Red
        }
    }
    
    // Update improvement suggestions
    function updateImprovements(data) {
        const categories = {
            lighting: [],
            face: [],
            posture: [],
            eye: [],
            expression: [],
            hand: [],
            general: []
        };
        // Lighting
        if (data.lighting.status !== 'good') {
            categories.lighting.push(`<i class='fas fa-lightbulb'></i> ${data.lighting.message}`);
        }
        // Face
        if (data.multiple_faces) {
            categories.face.push(`<i class='fas fa-users'></i> Multiple faces detected. Please ensure only one person is visible in the frame.`);
        } else if (!data.face_position.is_centered) {
            categories.face.push(`<i class='fas fa-user'></i> ${data.face_position.message}`);
        }
        // Posture
        if (data.scores.posture < 70) {
            categories.posture.push(`<i class='fas fa-chair'></i> Focus on maintaining a straight posture - keep your shoulders back and head up.`);
        }
        // Eye Contact
        if (data.looking_direction !== 'direct') {
            switch(data.looking_direction) {
                case 'looking_left':
                case 'looking_right':
                    categories.eye.push(`<i class='fas fa-eye'></i> Keep your eyes focused on the camera to maintain good eye contact.`);
                    break;
                case 'looking_up':
                case 'looking_down':
                    categories.eye.push(`<i class='fas fa-eye'></i> Adjust your gaze to look directly at the camera.`);
                    break;
                case 'not_detected':
                    if (!data.multiple_faces) {
                        categories.eye.push(`<i class='fas fa-eye-slash'></i> Position yourself so your face is clearly visible to the camera.`);
                    }
                    break;
            }
        }
        // Expression
        if (data.scores.emotion < 60 && data.face_position.is_centered) {
            categories.expression.push(`<i class='fas fa-smile'></i> Try to appear more relaxed and show more positive expressions.`);
        } else if (!data.face_position.is_centered) {
            categories.expression.push(`<i class='fas fa-smile'></i> Face not detected, so expression can't be analyzed.`);
        }
        // Hand
        if (data.face_touching && data.face_position.is_centered) {
            categories.hand.push(`<i class='fas fa-hand-paper'></i> Stop touching your face - this can make you appear nervous and is unprofessional.`);
        }
        if (data.scores.hand < 70 && !data.face_touching && data.face_position.is_centered) {
            categories.hand.push(`<i class='fas fa-hand-paper'></i> Work on using more natural hand gestures while speaking.`);
        } else if (!data.face_position.is_centered) {
            categories.hand.push(`<i class='fas fa-hand-paper'></i> Face not detected, so hand movement can't be analyzed.`);
        }
        // General
        if (
            categories.lighting.length === 0 &&
            categories.face.length === 0 &&
            categories.posture.length === 0 &&
            categories.eye.length === 0 &&
            categories.expression.length === 0 &&
            categories.hand.length === 0
        ) {
            categories.general.push(`<i class='fas fa-check-circle'></i> Great job! Keep maintaining your current body language.`);
        }
        // Render suggestions
        improvementList.innerHTML = Object.values(categories).flat().map(suggestion => `<li>${suggestion}</li>`).join('');
    }
    
    // Update overall feedback
    function updateOverallFeedback(data) {
        if (data.multiple_faces) {
            overallFeedback.textContent = "Please ensure only one person is visible in the frame for accurate analysis.";
            return;
        }
        
        if (data.lighting.status !== 'good') {
            overallFeedback.textContent = `Please adjust your lighting: ${data.lighting.message} This will help provide more accurate feedback.`;
            return;
        }
        
        if (!data.face_position.is_centered) {
            overallFeedback.textContent = `Please adjust your position: ${data.face_position.message} This will help provide more accurate feedback.`;
            return;
        }
        
        const avgScore = (data.scores.posture + data.scores.eye_contact + data.scores.emotion + data.scores.hand) / 4;
        
        let feedback = "";
        if (data.face_touching) {
            feedback = "Your body language needs improvement. The most important thing is to stop touching your face, as this appears nervous and unprofessional. Also focus on maintaining good posture and positive expressions.";
        } else if (avgScore >= 85) {
            feedback = "Excellent body language! You're presenting yourself very professionally. Your posture, expressions, and gestures work together to create a strong, confident presence.";
        } else if (avgScore >= 70) {
            feedback = "Good overall presence. With a few minor adjustments to your posture, expressions, and gestures, you'll make an even stronger impression.";
        } else {
            feedback = "Your body language needs some improvement. Focus on sitting straight, maintaining eye contact, showing positive expressions, and using natural hand gestures. Practice these aspects and you'll see significant improvement.";
        }
        
        overallFeedback.textContent = feedback;
    }
    
    // Capture frame and send for analysis
    async function captureAndAnalyze() {
        showLoader();
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg'));
        
        // Create form data
        const formData = new FormData();
        formData.append('frame', blob, 'frame.jpg');
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Analysis failed');
            
            const data = await response.json();
            
            // Update UI with results
            const faceDetected = data.face_position && data.face_position.is_centered;
            updatePostureStatus(data.scores.posture);
            updateEyeContactStatus(data.scores.eye_contact, data.looking_direction, data.face_position);
            updateEmotionStatus(data.scores.emotion, data.emotion, faceDetected);
            updateHandStatus(data.scores.hand, data.hand_movement, data.face_touching, faceDetected);
            updateLightingStatus(data.lighting);
            updateImprovements(data);
            updateOverallFeedback(data);
            
        } catch (err) {
            console.error('Error during analysis:', err);
        } finally {
            hideLoader();
        }
    }
    
    // Start analysis
    async function startAnalysis() {
        if (await startWebcam()) {
            isAnalyzing = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            
            // Wait for video to be ready
            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });
            
            // Start analysis loop
            analysisInterval = setInterval(captureAndAnalyze, 1000); // Analyze every second
        }
    }
    
    // Stop analysis
    function stopAnalysis() {
        isAnalyzing = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        
        stopWebcam();
        hideLoader();
        
        // Reset status messages
        postureStatus.textContent = "Waiting for analysis...";
        eyeContactStatus.textContent = "Waiting for analysis...";
        emotionStatus.textContent = "Waiting for analysis...";
        handStatus.textContent = "Waiting for analysis...";
        improvementList.innerHTML = "<li><i class='fas fa-arrow-right'></i> Start the analysis to get real-time feedback</li>";
        overallFeedback.textContent = "Start the analysis to get an overall assessment of your body language.";
    }
    
    // Event listeners
    startButton.addEventListener('click', startAnalysis);
    stopButton.addEventListener('click', stopAnalysis);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopAnalysis();
    });
}); 