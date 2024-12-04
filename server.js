const express = require("express");
const connectDB = require("./db");
const User = require("./models/User");
const Class = require("./models/Class");
const Task = require("./models/Task");
const Submission = require('./models/Submission');
const app = express();

app.use(express.json());

connectDB();

// Sample route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Route to get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find(); // Fetch all documents from the users collection
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// Route to insert a new user
app.post("/api/users", async (req, res) => {
  const {
    username,
    email,
    reputation_score,
    profile_picture,
    joined_classes,
    submissions,
    reputation,
  } = req.body;

  try {
    // Create a new user instance
    const newUser = new User({
      username,
      email,
      reputation_score,
      profile_picture,
      joined_classes,
      created_at: Date.now(),
      submissions,
    });

    // Save the new user to the database
    await newUser.save();

    // Send a response back with the newly created user
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
// Utility function to generate a unique class code
const generateClassCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += characters[Math.floor(Math.random() * characters.length)];
  }
  return code;
};

// Route to insert a new class
app.post("/api/classes", async (req, res) => {
  const {
    class_name,
    description,
    created_by,
    members,
    experts,
    admins,
    tasks,
    invites,
  } = req.body;

  try {
    // Generate class_code and set creation date on the server
    const class_code = generateClassCode();
    const created_at = new Date();

    // Create a new class instance
    const newClass = new Class({
      class_name,
      description,
      class_code,
      created_by,
      created_at,
      members,
      experts,
      admins,
      tasks,
      invites,
    });

    // Save the new class to the database
    await newClass.save();

    // Respond with the newly created class
    res.status(201).json(newClass);
  } catch (error) {
    console.error("Error inserting class:", error.message);
    res.status(500).send("Server Error");
  }
});

//inserting task
app.post("/api/task", async (req, res) => {
  // Parse the incoming JSON body
  const {
    class_id,
    title,
    description,
    created_by,
    due_date,
    status,
    submissions,
    document,
  } = req.body;

  // Log the incoming data for debugging
  console.log("Request Body:", req.body);

  // Check if the document URL is provided
  if (!document) {
    return res.status(400).json({ error: "No file URL provided" });
  }

  try {
    // Create a new task with the provided data
    const newTask = new Task({
      class_id,
      title,
      description,
      created_by,
      created_at: Date.now(),
      status,
      submissions,
      due_date,
      document, // This will be the file URL from the client
    });

    // Save the task to the database
    await newTask.save();
    res.status(201).json(newTask); // Return the new task
  } catch (error) {
    console.error("Error creating task:", error.message);
    res.status(500).send("Server Error");
  }
});
//getting all submissions under a task
app.get('/api/submissions/:task_id', async (req, res) => {
  try {
    const { task_id } = req.params;

    // Validate the task_id
    if (!task_id) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
    }

    // Find submissions by task_id
    const submissions = await Submission.find({ task_id });

    // Check if no submissions exist
    if (!submissions || submissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No submissions found for the provided task ID',
        data: [],
      });
    }

    // Return submissions if found
    res.status(200).json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: submissions,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Unable to retrieve submissions.',
    });
  }
});

//submitting a task
app.post('/api/submissions', async (req, res) => {
  try {
    const { task_id, user_id, submitted_at, document, feedback, user_upvotes, expert_upvotes } = req.body;

    // Validate required fields
    if (!task_id || !user_id || !submitted_at || !document) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: task_id, user_id, submitted_at, or document',
      });
    }

    // Create a new submission object
    const newSubmission = new Submission({
      task_id,
      user_id,
      submitted_at: new Date(submitted_at), // Ensure the date is valid
      document,
      feedback: feedback || [], // Default to an empty array if not provided
      user_upvotes: user_upvotes || [], // Default to an empty array if not provided
      expert_upvotes: expert_upvotes || [], // Default to an empty array if not provided
    });

    // Save the submission to the database
    const savedSubmission = await newSubmission.save();

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: savedSubmission,
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Unable to create submission.',
    });
  }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));