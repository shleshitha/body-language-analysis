# AI-Based Body Language Analysis for Real-Time Interview Feedback

This application provides real-time body language analysis during interviews using your webcam. It analyzes posture, eye contact, hand gestures, and facial expressions to provide instant feedback.

## Setup Instructions

1. Clone this repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the backend server:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```
3. Click "Start Analysis" to begin the interview feedback session
4. Allow camera access when prompted
5. The system will analyze your:
   - Posture
   - Eye Contact
   - Hand Gestures
   - Facial Expressions

## Features

- Real-time body language analysis
- Instant feedback on posture and gestures
- Emotion detection
- Comprehensive performance summary
- User-friendly web interface

## Technology Stack

- Backend: Flask
- Computer Vision: MediaPipe, OpenCV
- Emotion Detection: DeepFace
- Frontend: HTML, CSS, JavaScript
- Real-time Communication: Flask-SocketIO

## Note

Make sure your webcam is properly connected and accessible to the browser. 