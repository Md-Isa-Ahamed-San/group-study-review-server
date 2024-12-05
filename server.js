const express = require("express");
const connectDB = require("./db");
const User = require("./models/User");
const Class = require("./models/Class");
const Task = require("./models/Task");
const Submission = require("./models/Submission");
const app = express();

app.use(express.json());

connectDB();

// Sample route
app.get("/", (req, res) => {
  res.send("API is running...");
});

//TODO - USER MANAGEMENT

// fetching all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find(); // Fetch all documents from the users collection
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});


//Fetch classes associated with a user
app.get("/api/classes/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Query for classes where the user is in members or experts array
    const userClasses = await Class.find({
      $or: [
        { members: userId }, // Check if user is in members
        { experts: userId }, // Check if user is in experts
      ],
    });

    // If no classes are found, return a message
    if (userClasses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No classes found for the given user ID.",
      });
    }

    // Return the classes
    res.status(200).json({
      success: true,
      message: "Classes fetched successfully.",
      data: userClasses,
    });
  } catch (error) {
    console.error("Error fetching user classes:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to fetch classes.",
    });
  }
});

// user register for the website

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

//TODO-CLASS MANAGEMENT

// User joins a class
app.post("/api/classes/join", async (req, res) => {
  const { email, class_code } = req.body; // Expecting userId and classCode from the request body

  try {
    // Find the class by classCode
    const foundClass = await Class.findOne({ class_code: class_code });

    // If the class does not exist
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if the user is already a member
    if (foundClass.members.includes(email)) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this class.",
      });
    }

    // Add the user to the members array
    foundClass.members.push(email);

    // Save the updated class
    await foundClass.save();

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "User successfully joined the class.",
      data: foundClass,
    });
  } catch (error) {
    console.error("Error joining class:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to join class.",
    });
  }
});

// User leaves a class
app.post("/api/classes/leave", async (req, res) => {
  const { email, classCode } = req.body; // Expecting userId and classCode from the request body

  try {
    // Find the class by classCode
    const foundClass = await Class.findOne({ class_code: classCode });

    // If the class does not exist
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if the user is not a member of the class
    if (!foundClass.members.includes(email)) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this class.",
      });
    }

    // Remove the user from the members array
    foundClass.members = foundClass.members.filter((id) => id !== userId);

    // Save the updated class
    await foundClass.save();

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "User successfully left the class.",
      data: foundClass,
    });
  } catch (error) {
    console.error("Error leaving class:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to leave class.",
    });
  }
});

// create a new class
app.post("/api/classes", async (req, res) => {
  const { class_name, description, created_by } = req.body;

  try {
    // Generate class_code on the server
    const class_code = generateClassCode();

    // Ensure the creator is in both admins and members arrays
    const admins = [created_by]; // Creator is automatically an admin
    const members = [created_by]; // Creator is automatically a member
    const experts = []; // Optional: Initialize as empty
    const tasks = []; // Default empty task list
    const invites = []; // Default empty invites list
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

//get a class details
app.get("/api/classes/:class_code", async (req, res) => {
  const { class_code } = req.params;

  try {
    // Find the class by class_code
    const classDetails = await Class.findOne({ class_code })
      .populate('tasks'); // Populate tasks if needed

    // If class not found
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code."
      });
    }

    // Return class details
    res.status(200).json({
      success: true,
      message: "Class details retrieved successfully.",
      data: classDetails
    });

  } catch (error) {
    console.error("Error retrieving class details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to retrieve class details."
    });
  }
});

// Update class details partially by class code
app.patch("/api/classes/:class_code", async (req, res) => {
  const { class_code } = req.params;
  const { email, ...updates } = req.body; // Separate email from updates
console.log(class_code,email,updates)
  try {
    // First find the class
    const classDoc = await Class.findOne({ class_code });

    // Check if class exists
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code."
      });
    }

    // Check if user is authorized (is an admin)
    if (!classDoc.admins.includes(email)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can update class details."
      });
    }

    // Apply updates manually
    Object.keys(updates).forEach((key) => {
      // Prevent updating certain fields like class_code or created_by
      if (!['class_code', 'created_by', 'created_at'].includes(key)) {
        classDoc[key] = updates[key];
      }
    });

    // Save the updated class
    const updatedClass = await classDoc.save();

    res.status(200).json({
      success: true,
      message: "Class updated successfully.",
      data: updatedClass
    });

  } catch (error) {
    console.error("Error updating class:", error.message);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Invalid update data.",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error. Unable to update class."
    });
  }
});
//delete a class
app.delete("/api/classes/:class_code", async (req, res) => {
  const { class_code } = req.params;
  const { email } = req.body; // Need email to check admin status

  try {
    // First find the class
    const classDoc = await Class.findOne({ class_code });

    // Check if class exists
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code."
      });
    }

    // Check if user is authorized (is an admin)
    if (!classDoc.admins.includes(email)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can delete this class."
      });
    }

    // Delete the class
    await Class.findOneAndDelete({ class_code });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully."
    });

  } catch (error) {
    console.error("Error deleting class:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to delete class."
    });
  }
});
// Change user role in a class
app.patch("/api/classes/:class_code/change-role", async (req, res) => {
  const { class_code } = req.params; // Get class code from URL params
  const { adminEmail, targetEmail, newRole } = req.body; // Get admin email, target email, and desired role

  try {
    // Find the class by class_code
    const classDoc = await Class.findOne({ class_code });

    // If the class does not exist
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if the requester is an admin of the class
    if (!classDoc.admins.includes(adminEmail)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can change user roles.",
      });
    }

    // Ensure the target user is part of the class
    const isMember = classDoc.members.includes(targetEmail);
    const isExpert = classDoc.experts.includes(targetEmail);

    if (!isMember && !isExpert) {
      return res.status(400).json({
        success: false,
        message: "Target user is not a part of this class.",
      });
    }

    // Update roles based on the desired newRole
    if (newRole === "expert") {
      // Promote user to expert
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Target user is not a member of the class.",
        });
      }

      // Remove user from members and add to experts
      classDoc.members = classDoc.members.filter((email) => email !== targetEmail);
      if (!classDoc.experts.includes(targetEmail)) {
        classDoc.experts.push(targetEmail);
      }
    } else if (newRole === "member") {
      // Demote user to member
      if (!isExpert) {
        return res.status(400).json({
          success: false,
          message: "Target user is not an expert in the class.",
        });
      }

      // Remove user from experts and add to members
      classDoc.experts = classDoc.experts.filter((email) => email !== targetEmail);
      if (!classDoc.members.includes(targetEmail)) {
        classDoc.members.push(targetEmail);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Valid roles are 'member' and 'expert'.",
      });
    }

    // Save the updated class document
    await classDoc.save();

    // Respond with success
    res.status(200).json({
      success: true,
      message: `User role updated successfully to ${newRole}.`,
      data: classDoc,
    });
  } catch (error) {
    console.error("Error changing user role:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to change user role.",
    });
  }
});

//TODO-TASK MANAGEMENT
//Fetch details of a specific task.
app.get("/api/task/:task_id", async (req, res) => {
  const { task_id } = req.params; // Extract task_id from the URL path

  try {
    // Fetch the task by ID
    const task = await Task.findById(task_id)
      .populate("class_id", "name") // Populate class details (adjust as per Class schema)
      .populate("submissions", "email submitted_at document") // Populate submission details
      .populate("created_by", "name email"); // Populate creator details (if `created_by` references User model)

    // Check if the task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    // Respond with the task details
    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Error fetching task by ID:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to fetch task details.",
    });
  }
});

// Fetch all tasks in a class (active and completed)
// Fetch all tasks in a class (active and completed)
app.get("/api/classes/:classId/tasks", async (req, res) => {
  const { classId } = req.params;

  try {
    // Find the class by its ID
    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Extract the task IDs from the class document
    const taskIds = classData.tasks;

    if (!taskIds || taskIds.length === 0) {
      return res.status(404).json({ message: "No tasks found for this class" });
    }

    // Find all tasks whose IDs are in the taskIds array
    const tasks = await Task.find({ _id: { $in: taskIds } });

    // Separate tasks into ongoing and completed
    const activeTasks = tasks.filter((task) => task.status === "ongoing");
    const completedTasks = tasks.filter((task) => task.status === "completed");

    // Respond with the task data
    res.status(200).json({
      success: true,
      data: {
        activeTasks,
        completedTasks,
      },
    });
  } catch (error) {
    console.error("Error fetching tasks for class:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to fetch tasks.",
    });
  }
});


//Update task details after verifying the creator of the task
app.patch("/api/task/:task_id", async (req, res) => {
  const { task_id } = req.params; // Extract task ID from the URL
  const { email, ...updates } = req.body; // Extract user ID and updates from the request body

  try {
    // Find the task by ID
    const task = await Task.findById(task_id);

    // Check if the task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    // Check if the user is the creator of the task
    if (task.created_by !== email) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only the creator of the task can update it.",
      });
    }

    // Update the task with the provided fields
    Object.keys(updates).forEach((key) => {
      task[key] = updates[key];
    });

    // Save the updated task
    const updatedTask = await task.save();

    // Respond with the updated task details
    res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to update task.",
    });
  }
});

//Create a new task in a class
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
      document,
    });

    // Save the task to the database
    await newTask.save();

    // Find the class and update its tasks array
    const updatedClass = await Class.findOneAndUpdate(
      { _id: class_id }, // Assuming class_id is the class_code
      { $push: { tasks: newTask._id } }, // Add the new task ID to the tasks array
      { new: true } // Return the updated document
    );

    // Check if class was found and updated
    if (!updatedClass) {
      // If class wasn't found, delete the task we just created
      await Task.findByIdAndDelete(newTask._id);
      return res.status(404).json({
        success: false,
        message: "Class not found. Task creation cancelled."
      });
    }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: newTask
    });

  } catch (error) {
    console.error("Error creating task:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
});

//Delete a new task
app.delete("/api/task/:taskId", async (req, res) => {
  const { taskId } = req.params;

  // Log the incoming request for debugging
  console.log("Attempting to delete task:", taskId);

  try {
    // First find the task to get its class_id before deletion
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Remove the task from the Task collection
    await Task.findByIdAndDelete(taskId);

    // Remove the task reference from the corresponding class
    const updatedClass = await Class.findByIdAndUpdate(
      task.class_id,
      { $pull: { tasks: taskId } }, // Remove the task ID from the tasks array
      { new: true }
    );

    // Check if class was found and updated
    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found but task was deleted"
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: {
        deletedTaskId: taskId,
        updatedClass: updatedClass._id
      }
    });

  } catch (error) {
    console.error("Error deleting task:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
});

//TODO-SUBMISSION MANAGEMENT

//Fetch all submissions for a task.
app.get("/api/submissions/:task_id", async (req, res) => {
  try {
    const { task_id } = req.params;

    // Validate the task_id
    if (!task_id) {
      return res.status(400).json({
        success: false,
        message: "Task ID is required",
      });
    }

    // Find submissions by task_id
    const submissions = await Submission.find({ task_id });

    // Check if no submissions exist
    if (!submissions || submissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No submissions found for the provided task ID",
        data: [],
      });
    }

    // Return submissions if found
    res.status(200).json({
      success: true,
      message: "Submissions retrieved successfully",
      data: submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to retrieve submissions.",
    });
  }
});

//Submit an assignment (PDF format).
app.post("/api/submissions", async (req, res) => {
  try {
    const {
      task_id,
      email,
      submitted_at,
      document,
      feedback,
      user_upvotes,
      expert_upvotes,
    } = req.body;

    // Validate required fields
    if (!task_id || !email || !submitted_at || !document) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: task_id, email, submitted_at, or document",
      });
    }

    // Create a new submission object
    const newSubmission = new Submission({
      task_id,
      email,
      submitted_at: new Date(submitted_at), // Ensure the date is valid
      document,
      feedback: feedback || [], // Default to an empty array if not provided
      user_upvotes: user_upvotes || [], // Default to an empty array if not provided
      expert_upvotes: expert_upvotes || [], // Default to an empty array if not provided
    });

    // Save the submission to the database
    const savedSubmission = await newSubmission.save();

    // Update the Task document to include the submission ID
    await Task.findByIdAndUpdate(
      task_id,
      { $push: { submissions: savedSubmission._id } }, // Add the submission ID to the submissions array
      { new: true } // Return the updated document
    );

    res.status(201).json({
      success: true,
      message: "Submission created successfully and linked to the task.",
      data: savedSubmission,
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to create submission.",
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

