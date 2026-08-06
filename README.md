# ExamGuardian

ExamGuardian is a modern web-based examination monitoring platform designed for educational institutions.

The platform allows teachers to create AI-generated exams from uploaded PDF documents while monitoring student behavior during examinations in real time.

## Core Vision

ExamGuardian will combine secure authentication, intelligent exam creation, live student monitoring, and actionable analytics into one unified platform for schools, colleges, and training centers.

The system will help teachers create assessments faster, monitor students responsibly during exams, and generate meaningful reports that improve academic oversight.

## Planned Modules

### Module 1 - Authentication

- Teacher accounts
- Student accounts
- Secure login and role-based access
- Admin oversight for institutional management

### Module 2 - Teacher Dashboard

- Upload PDF documents
- Generate exams from uploaded content
- View analytics for exams and students
- View enrolled students and classes
- Export reports for review and sharing

### Module 3 - Student Dashboard

- View available exams
- Start exams
- Continue partially completed exams
- Submit completed exams

### Module 4 - Exam Monitoring

The monitoring system will track student activity during exams in real time, including:

- Record
- Mouse movement
- Mouse clicks
- Question time
- Time per page
- Window resize
- Fullscreen exit
- Tab switching
- Copy attempts
- Paste attempts
- Right click
- Refresh
- Internet disconnect
- Window blur
- Window focus
- Keyboard shortcuts
- Question revisits
- Idle time
- Submission time
- Browser type
- Device
- IP address
- Approximate location when appropriate and permitted
- Session duration

### Module 5 - AI

Teachers will be able to upload documents such as:

- Networking.pdf

The system will extract text from uploaded files, understand the content, and generate question types such as:

- Multiple Choice
- True/False
- Fill in the Blank
- Short Answer

Additional enhancements may include:

- Difficulty levels
- Bloom's Taxonomy alignment

### Module 6 - Analytics

Teachers will be able to view:

- Student Focus Score
- Average Time
- Question Difficulty
- Cheating Risk
- Most Difficult Question
- Heatmaps
- Completion Rate
- Score Distribution

### Module 7 - Notifications

The platform will notify users about:

- Exam started
- Exam finished
- Student flagged
- Report generated
- Weekly statistics

Email notifications will be sent through Resend.

## Proposed Database Tables

The system will be built around the following Supabase tables:

- users
- teachers
- students
- courses
- classes
- exams
- questions
- answers
- attempts
- exam_sessions
- monitoring_events
- analytics
- reports
- notifications
- pdf_uploads
- ai_generated_questions

## Proposed Architecture Flow

Teacher uploads PDF
↓
PDF saved
↓
Text extracted
↓
AI generates questions
↓
Teacher reviews
↓
Teacher publishes
↓
Students receive notification
↓
Student starts exam
↓
Monitoring begins
↓
Events stored
↓
Analytics generated
↓
Teacher receives report

## Feature Highlight

Rather than simply flagging suspicious behavior, the platform will provide a Student Activity Timeline so teachers can review a session in context. For example:

- 09:00:00 Exam started
- 09:03:11 Question 1 answered
- 09:05:32 Switched tabs for 12 seconds
- 09:06:10 Returned to the exam
- 09:08:45 Copied text
- 09:09:00 Returned to Question 2
- 09:12:10 Idle for 45 seconds
- 09:15:33 Entered fullscreen
- 09:18:42 Submitted

This timeline will provide richer insight than a single "Cheating Risk: High" label.

## Recommended Development Order

1. Initialize a Next.js project with TypeScript
2. Set up GitHub and push the initial project
3. Create a Supabase project and connect it
4. Implement authentication with Teacher/Admin/Student roles
5. Design and create the database schema
6. Build the teacher and student dashboards
7. Add exam creation and exam-taking flows
8. Implement monitoring event collection
9. Add analytics and reporting
10. Integrate AI-powered PDF question generation
11. Deploy to Vercel and configure Resend for email notifications
12. Finally, work on AI and PDF processing enhancements

## Technology Stack

- Next.js
- TypeScript
- Supabase
- Resend
- Vercel
- AI / PDF processing tools
