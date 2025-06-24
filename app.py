from flask import Flask, render_template, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import os
import tempfile

app = Flask(__name__)
CORS(app)

# Initialize MediaPipe solutions
mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

hands = mp_hands.Hands(
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def analyze_posture(pose_landmarks):
    if pose_landmarks is None:
        return 0
    
    # Get shoulder landmarks
    left_shoulder = pose_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_shoulder = pose_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    
    # Calculate shoulder alignment
    shoulder_slope = abs(left_shoulder.y - right_shoulder.y)
    
    # Score based on shoulder alignment (0-100)
    posture_score = max(0, 100 - (shoulder_slope * 1000))
    
    return int(posture_score)

def check_lighting(frame):
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Calculate average brightness
    brightness = np.mean(gray)
    
    # Calculate contrast
    contrast = np.std(gray)
    
    if brightness < 50:
        return {"status": "too_dark", "message": "The lighting is too dark. Please turn on more lights."}
    elif brightness > 220:
        return {"status": "too_bright", "message": "The lighting is too bright. Try reducing direct light."}
    elif contrast < 20:
        return {"status": "low_contrast", "message": "The lighting is too flat. Try adding more directional lighting."}
    else:
        return {"status": "good", "message": "Lighting is good"}

def check_face_position(face_landmarks):
    if face_landmarks is None:
        return {"is_centered": False, "message": "No face detected"}
    
    # Get face bounding box
    face_points = np.array([[lm.x, lm.y] for lm in face_landmarks.landmark])
    face_center_x = np.mean(face_points[:, 0])
    face_center_y = np.mean(face_points[:, 1])
    
    # Check if face is centered
    is_centered = 0.3 < face_center_x < 0.7 and 0.2 < face_center_y < 0.8
    
    if not is_centered:
        if face_center_x <= 0.3:
            return {"is_centered": False, "message": "Move your face more to the right"}
        elif face_center_x >= 0.7:
            return {"is_centered": False, "message": "Move your face more to the left"}
        elif face_center_y <= 0.2:
            return {"is_centered": False, "message": "Move your face down"}
        else:
            return {"is_centered": False, "message": "Move your face up"}
    
    return {"is_centered": True, "message": "Face is well positioned"}

def analyze_eye_contact(face_landmarks):
    if face_landmarks is None:
        return {"score": 0, "looking_direction": "not_detected"}
    
    try:
        # Get eye landmarks
        left_eye_center = face_landmarks.landmark[33]  # Left eye center
        right_eye_center = face_landmarks.landmark[263]  # Right eye center
        left_eye_left = face_landmarks.landmark[130]  # Left eye outer corner
        left_eye_right = face_landmarks.landmark[243]  # Left eye inner corner
        right_eye_left = face_landmarks.landmark[463]  # Right eye inner corner
        right_eye_right = face_landmarks.landmark[359]  # Right eye outer corner
        
        # Calculate eye direction
        left_eye_direction = (left_eye_center.x - (left_eye_left.x + left_eye_right.x) / 2)
        right_eye_direction = (right_eye_center.x - (right_eye_left.x + right_eye_right.x) / 2)
        
        # Average eye direction
        eye_direction = (left_eye_direction + right_eye_direction) / 2
        
        # Calculate vertical gaze
        left_eye_vertical = left_eye_center.y - (face_landmarks.landmark[159].y + face_landmarks.landmark[145].y) / 2
        right_eye_vertical = right_eye_center.y - (face_landmarks.landmark[386].y + face_landmarks.landmark[374].y) / 2
        vertical_gaze = (left_eye_vertical + right_eye_vertical) / 2
        
        # Determine looking direction
        if abs(eye_direction) > 0.01:
            if eye_direction > 0:
                looking_direction = "looking_left"
                score = max(0, 50 - abs(eye_direction) * 1000)
            else:
                looking_direction = "looking_right"
                score = max(0, 50 - abs(eye_direction) * 1000)
        elif abs(vertical_gaze) > 0.01:
            if vertical_gaze > 0:
                looking_direction = "looking_down"
                score = max(0, 50 - abs(vertical_gaze) * 1000)
            else:
                looking_direction = "looking_up"
                score = max(0, 50 - abs(vertical_gaze) * 1000)
        else:
            looking_direction = "direct"
            score = 100
        
        return {"score": int(score), "looking_direction": looking_direction}
    except:
        return {"score": 0, "looking_direction": "not_detected"}

def analyze_hand_movements(hand_landmarks, face_landmarks):
    if not hand_landmarks or not face_landmarks:
        return {"score": 70, "movement": "neutral", "face_touch": False}
    
    try:
        movement_type = "neutral"
        score = 70
        face_touching = False
        
        # Get face bounding box
        face_points = np.array([[lm.x, lm.y] for lm in face_landmarks.landmark])
        face_min_x = np.min(face_points[:, 0]) - 0.05  # Add margin
        face_max_x = np.max(face_points[:, 0]) + 0.05
        face_min_y = np.min(face_points[:, 1]) - 0.05
        face_max_y = np.max(face_points[:, 1]) + 0.05
        
        for hand in hand_landmarks:
            # Get key hand landmarks
            wrist = hand.landmark[0]
            index_tip = hand.landmark[8]
            middle_tip = hand.landmark[12]
            ring_tip = hand.landmark[16]
            pinky_tip = hand.landmark[20]
            thumb_tip = hand.landmark[4]
            
            # Check for face touching
            finger_points = [index_tip, middle_tip, ring_tip, pinky_tip, thumb_tip]
            for finger in finger_points:
                if (face_min_x <= finger.x <= face_max_x and 
                    face_min_y <= finger.y <= face_max_y):
                    face_touching = True
                    score = 30
                    movement_type = "face touching"
                    break
            
            if not face_touching:
                # Check hand position
                if wrist.y < 0.3:  # Hands too high
                    movement_type = "too high"
                    score = 40
                elif wrist.y > 0.8:  # Hands too low
                    movement_type = "too low"
                    score = 50
                # Check for excessive side movement
                elif abs(wrist.x - 0.5) > 0.4:
                    movement_type = "too wide"
                    score = 60
                # Natural gesturing range
                else:
                    # Calculate hand spread (natural vs tense)
                    hand_spread = abs(index_tip.x - pinky_tip.x)
                    if hand_spread > 0.2:
                        movement_type = "expressive"
                        score = 90
                    else:
                        movement_type = "natural"
                        score = 85
        
        return {
            "score": score, 
            "movement": movement_type,
            "face_touch": face_touching
        }
    except:
        return {"score": 70, "movement": "neutral", "face_touch": False}

def analyze_emotion(face_landmarks):
    if face_landmarks is None:
        return {"score": 50, "emotion": "neutral"}
    
    try:
        # Get key facial landmarks
        mouth_corners = [face_landmarks.landmark[61], face_landmarks.landmark[291]]  # Left and right mouth corners
        upper_lip = face_landmarks.landmark[13]  # Upper lip
        lower_lip = face_landmarks.landmark[14]  # Lower lip
        upper_teeth = face_landmarks.landmark[0]  # Upper teeth
        lower_teeth = face_landmarks.landmark[17]  # Lower teeth
        left_eyebrow = face_landmarks.landmark[282]  # Left eyebrow
        right_eyebrow = face_landmarks.landmark[52]  # Right eyebrow
        
        # Calculate facial features
        mouth_height = abs(upper_lip.y - lower_lip.y)
        mouth_curve = (mouth_corners[0].y + mouth_corners[1].y) / 2 - upper_lip.y
        teeth_visible = abs(upper_teeth.y - lower_teeth.y)
        eyebrow_height = (left_eyebrow.y + right_eyebrow.y) / 2
        
        # Enhanced emotion detection
        if mouth_curve > 0.01 and teeth_visible > 0.03:  # Big smile with teeth
            return {"score": 95, "emotion": "big smile"}
        elif mouth_curve > 0.01 and mouth_height > 0.03:  # Open mouth smile
            return {"score": 90, "emotion": "happy"}
        elif mouth_curve > 0.005:  # Gentle smile
            return {"score": 85, "emotion": "pleasant"}
        elif mouth_height > 0.07:  # Speaking enthusiastically
            return {"score": 80, "emotion": "engaging"}
        elif eyebrow_height < 0.25:  # Focused/concerned
            if mouth_curve < -0.01:
                return {"score": 40, "emotion": "concerned"}
            else:
                return {"score": 75, "emotion": "focused"}
        elif mouth_curve < -0.01:  # Frowning
            return {"score": 30, "emotion": "negative"}
        else:  # Neutral expression
            return {"score": 60, "emotion": "neutral"}
            
    except:
        return {"score": 50, "emotion": "neutral"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_frame():
    try:
        # Get the uploaded file
        if 'frame' not in request.files:
            return jsonify({'error': 'No frame uploaded'}), 400
        
        file = request.files['frame']
        
        # Save the file temporarily
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, 'temp_frame.jpg')
        file.save(temp_path)
        
        # Read the frame
        frame = cv2.imread(temp_path)
        
        if frame is None:
            return jsonify({'error': 'Invalid frame data'}), 400
        
        # Check lighting conditions
        lighting_result = check_lighting(frame)
        
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        face_results = face_mesh.process(rgb_frame)
        pose_results = pose.process(rgb_frame)
        hands_results = hands.process(rgb_frame)
        
        # Initialize results
        posture_score = 0
        eye_contact_result = {"score": 0, "looking_direction": "not_detected"}
        emotion_result = {"score": 50, "emotion": "neutral"}
        hand_result = {"score": 70, "movement": "neutral", "face_touch": False}
        face_position_result = {"is_centered": False, "message": "No face detected"}
        
        # Check for multiple faces
        multiple_faces = False
        if face_results.multi_face_landmarks:
            if len(face_results.multi_face_landmarks) > 1:
                multiple_faces = True
                face_position_result = {"is_centered": False, "message": "Multiple faces detected"}
            else:
                face_landmarks = face_results.multi_face_landmarks[0]
                face_position_result = check_face_position(face_landmarks)
                eye_contact_result = analyze_eye_contact(face_landmarks)
                emotion_result = analyze_emotion(face_landmarks)
                
                if hands_results.multi_hand_landmarks:
                    hand_result = analyze_hand_movements(hands_results.multi_hand_landmarks, face_landmarks)
        
        if pose_results.pose_landmarks and not multiple_faces:
            posture_score = analyze_posture(pose_results.pose_landmarks)
        
        # Clean up temporary file
        os.remove(temp_path)
        
        return jsonify({
            'scores': {
                'posture': posture_score,
                'eye_contact': eye_contact_result['score'],
                'emotion': emotion_result['score'],
                'hand': hand_result['score']
            },
            'emotion': emotion_result['emotion'],
            'hand_movement': hand_result['movement'],
            'face_touching': hand_result['face_touch'],
            'looking_direction': eye_contact_result['looking_direction'],
            'face_position': face_position_result,
            'lighting': lighting_result,
            'multiple_faces': multiple_faces
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 