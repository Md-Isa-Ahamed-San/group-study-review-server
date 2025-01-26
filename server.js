const express = require("express");
const connectDB = require("./db");
const User = require("./models/User");
const Class = require("./models/Class");
const Task = require("./models/Task");
const Submission = require("./models/Submission");
const Feedback = require("./models/Feedback");
const cron = require("node-cron");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
} = require("./auth");

const app = express();
var cors = require("cors");
app.use(express.json());
app.use(cors());
connectDB();

// Schedule a cron job to run every hour
cron.schedule("* * * * *", async () => {
  console.log("Running scheduled job to update task statuses...");

  try {
    // Find all tasks that are ongoing and whose dueDate has passed
    const result = await Task.updateMany(
      { status: "ongoing", dueDate: { $lt: new Date() } },
      { $set: { status: "completed" } }
    );

    console.log(`${result.modifiedCount} tasks updated to 'completed' status.`);
  } catch (error) {
    console.error("Error updating task statuses:", error.message);
  }
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
}); //!complete

//fetching a user using email
app.get("/api/user/:email", async (req, res) => {
  const email = req.params.email;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate tokens
    const authToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      user,
      token: {
        authToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

//Fetch classes associated with a user

// Fetch classes associated with a user's email
app.get(
  "/api/classes/user/:email",
  verifyAccessToken,
  async (req, res) => {
    const { email } = req.params;
    // console.log("Authorization header:", req.headers.authorization);

    try {
      // First, find the user by email to get their ObjectId
      const user = await User.findOne({ email });
      // console.log(user);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No user found with the given email.",
        });
      }

      // Use the user's ObjectId to find classes where they are a member or expert
      const userClasses = await Class.find({
        $or: [
          { members: user._id }, // Check if the user is in members
          { experts: user._id }, // Check if the user is in experts
        ],
      });

      // Return classes or an empty array if none found
      return res.status(200).json({
        success: true,
        message: userClasses.length
          ? "Classes fetched successfully."
          : "User exists but has no associated classes.",
        data: userClasses,
      });
    } catch (error) {
      console.error("Error fetching user classes by email:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error. Unable to fetch classes.",
      });
    }
  }
);

//!complete

// user register for the website

app.post("/api/users", async (req, res) => {
  const { username, email, profile_picture } = req.body;
  // console.log(req.body)
  try {
    const newUser = new User({ username, email, profile_picture });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      // Handle duplicate key error for unique fields
      return res.status(400).send("Email already exists");
    }
    if (error.name === "ValidationError") {
      return res.status(400).send(error.message);
    }
    res.status(500).send("Server Error");
  }
}); //!complete

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

// Get all classes
app.get("/api/classes", verifyAccessToken, async (req, res) => {
  try {
    // Retrieve all classes from the database
    const classes = await Class.find();

    // Respond with the list of classes
    res.status(200).json({
      success: true,
      message: "Classes retrieved successfully.",
      data: classes,
    });
  } catch (error) {
    console.error("Error fetching classes:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to fetch classes.",
    });
  }
}); //!complete

// User joins a class
app.post("/api/classes/join",verifyAccessToken, async (req, res) => {
  const { id, class_code } = req.body; // Expecting userId and classCode from the request body

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
    if (foundClass.members.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this class.",
      });
    }

    // Add the user to the members array
    foundClass.members.push(id);

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
}); //!complete

// User leaves a class
app.post("/api/classes/leave",verifyAccessToken, async (req, res) => {
  const { userId, classId } = req.body; // Expecting userId and classId from the request body
  // console.log("req.body:", req.body);

  try {
    // Find the class by classId
    const foundClass = await Class.findOne({ _id: classId });

    // If the class does not exist
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class id.",
      });
    }

    // Check if the user is in members, experts, or admins
    const isMember = foundClass.members.some((id) => id.toString() === userId);
    const isExpert = foundClass.experts.some((id) => id.toString() === userId);
    const isAdmin = foundClass.admins.some((id) => id.toString() === userId);

    if (!isMember && !isExpert && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: "User is not part of this class in any role.",
      });
    }

    // Remove the user from members, experts, and admins arrays
    foundClass.members = foundClass.members.filter(
      (id) => id.toString() !== userId
    );
    foundClass.experts = foundClass.experts.filter(
      (id) => id.toString() !== userId
    );
    foundClass.admins = foundClass.admins.filter(
      (id) => id.toString() !== userId
    );

    // console.log("Updated members:", foundClass.members);
    // console.log("Updated experts:", foundClass.experts);
    // console.log("Updated admins:", foundClass.admins);

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
}); //!complete

// create a new class
app.post("/api/classes", verifyAccessToken, async (req, res) => {
  // console.log(req.body);
  const { class_name, description, created_by } = req.body;
  // console.log(
  //   "Authorization header inside create a new class:",
  //   req.headers.authorization
  // );
  console.log("req.body create a new class: ", req.body);
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
}); //!complete

//get a class details
app.get("/api/classes/:id",verifyAccessToken, async (req, res) => {
  const _id = req.params.id;
  const userId = req.query.userId; // Pass userId as a query parameter

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required to check submission status.",
    });
  }

  try {
    // Fetch the class and populate related fields
    const classDetails = await Class.findOne({ _id })
      .populate({
        path: "tasks",
        populate: {
          path: "submissions", // Populate submissions for each task
          select: "userId", // Only fetch userId from submissions
        },
      })
      .populate("members", "username email profile_picture")
      .populate("experts", "username email profile_picture")
      .populate("admins", "username email profile_picture");

    // If class not found
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Add `isSubmitted` field to each task
    classDetails.tasks.forEach((task) => {
      task.isSubmitted = task.submissions.some(
        (submission) => submission.userId.toString() === userId
      );
    });

    // Return class details with populated user data and submission status
    res.status(200).json({
      success: true,
      message: "Class details retrieved successfully.",
      data: classDetails,
    });
  } catch (error) {
    console.error("Error retrieving class details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to retrieve class details.",
    });
  }
});
//!complete

// Update class details partially by class code
app.patch("/api/classes/:id",verifyAccessToken, async (req, res) => {
  const _id = req.params.id;
  const { email, ...updates } = req.body;
  // console.log(_id, email, updates);
  try {
    // First find the class
    const classDoc = await Class.findOne({ _id });

    // Check if class exists
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if user is authorized (is an admin)
    if (!classDoc.admins.includes(email)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can update class details.",
      });
    }

    // Apply updates manually
    Object.keys(updates).forEach((key) => {
      // Prevent updating certain fields like class_code or created_by
      if (!["class_code", "created_by", "created_at"].includes(key)) {
        classDoc[key] = updates[key];
      }
    });

    // Save the updated class
    const updatedClass = await classDoc.save();

    res.status(200).json({
      success: true,
      message: "Class updated successfully.",
      data: updatedClass,
    });
  } catch (error) {
    console.error("Error updating class:", error.message);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid update data.",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error. Unable to update class.",
    });
  }
}); //!complete

//delete a class
app.delete("/api/classes/:id",verifyAccessToken, async (req, res) => {
  const _id = req.params.id;
  const { email } = req.body; // Need email to check admin status

  try {
    // First find the class
    const classDoc = await Class.findOne({ _id });

    // Check if class exists
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if user is authorized (is an admin)
    if (!classDoc.admins.includes(email)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can delete this class.",
      });
    }

    // Delete the class
    await Class.findOneAndDelete({ _id });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting class:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to delete class.",
    });
  }
}); //!complete

// Change user role in a class
app.patch("/api/classes/:id/change-role",verifyAccessToken, async (req, res) => {
  const _id = req.params.id; // Get class code from URL params
  const { adminId, userId, newRole } = req.body; // Get admin email, target email, and desired role

  try {
    // Find the class by class_code
    const classDoc = await Class.findOne({ _id });

    // If the class does not exist
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found with the provided class code.",
      });
    }

    // Check if the requester is an admin of the class
    if (!classDoc.admins.includes(adminId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only class admins can change user roles.",
      });
    }

    // Ensure the target user is part of the class
    const isMember = classDoc.members.includes(userId);
    const isExpert = classDoc.experts.includes(userId);

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
      classDoc.members = classDoc.members.filter(
        (id) => id.toString() !== userId
      );
      if (!classDoc.experts.includes(userId)) {
        classDoc.experts.push(userId);
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
      classDoc.experts = classDoc.experts.filter(
        (id) => id.toString() !== userId
      );
      if (!classDoc.members.includes(userId)) {
        classDoc.members.push(userId);
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
}); //!complete

//TODO-TASK MANAGEMENT

//Fetch details of a specific task.
app.get("/api/task/:task_id",verifyAccessToken, async (req, res) => {
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
}); //!complete

// Fetch all tasks in a class (active and completed)
app.get("/api/classes/:classId/tasks",verifyAccessToken, async (req, res) => {
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

    // Fetch ongoing tasks without populating submissions
    const activeTasks = await Task.find({
      _id: { $in: taskIds },
      status: "ongoing",
    });

    // Fetch completed tasks and populate submissions
    const completedTasks = await Task.find({
      _id: { $in: taskIds },
      status: "completed",
    }).populate({
      path: "submissions",
      model: "Submission", // Reference to the Submission model
      select:
        "task_id email submitted_at document feedback user_upvotes expert_upvotes", // Include only necessary fields
    });

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
}); //!complete

//Update task details after verifying the creator of the task
app.patch("/api/task/:task_id",verifyAccessToken, async (req, res) => {
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
app.post("/api/task",verifyAccessToken, async (req, res) => {
  const { class_id, title, description, created_by, dueDate, document } =
    req.body;

  console.log("Request Body:", req.body);

  // Check for required fields
  if (!class_id || !title || !created_by || !document) {
    return res.status(400).json({
      success: false,
      error:
        "Missing required fields: class_id, title, created_by, or document",
    });
  }

  try {
    // Check if the class exists
    const targetClass = await Class.findById(class_id);
    if (!targetClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if the user is part of the class
    const isUserInClass = targetClass.members.includes(created_by);
    const isExpertInClass = targetClass.experts.includes(created_by);
    if (!isUserInClass && !isExpertInClass) {
      return res.status(403).json({
        success: false,
        message: "User is not a member of the class",
      });
    }

    // Create a new task
    const newTask = new Task({
      class_id,
      title,
      description,
      created_by,
      created_at: Date.now(),
      dueDate,
      document,
    });

    // Save the task to the database
    await newTask.save();

    // Update the class with the new task ID
    const updatedClass = await Class.findByIdAndUpdate(
      class_id,
      { $push: { tasks: newTask._id } },
      { new: true }
    );

    if (!updatedClass) {
      // Rollback: delete the task if the class update fails
      await Task.findByIdAndDelete(newTask._id);
      return res.status(500).json({
        success: false,
        message:
          "Failed to update the class with the new task. Task creation rolled back.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: newTask,
    });
  } catch (error) {
    console.error("Error creating task:", error.message);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: error.message,
    });
  }
}); //!complete

//Delete a new task
app.delete("/api/task/:taskId",verifyAccessToken, async (req, res) => {
  const { taskId } = req.params;

  // Log the incoming request for debugging
  // console.log("Attempting to delete task:", taskId);

  try {
    // First find the task to get its class_id before deletion
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
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
        message: "Class not found but task was deleted",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: {
        deletedTaskId: taskId,
        updatedClass: updatedClass._id,
      },
    });
  } catch (error) {
    console.error("Error deleting task:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

//TODO-SUBMISSION MANAGEMENT
//checking if a user is submitted a task or not

//Fetch all submissions for a task.
app.get("/api/submissions/:task_id",verifyAccessToken, async (req, res) => {
  try {
    const { task_id } = req.params;

    // Validate the task_id
    if (!task_id) {
      return res.status(400).json({
        success: false,
        message: "Task ID is required",
      });
    }

    // Retrieve the task details
    const task = await Task.findById(task_id)
      .select("class_info title description")
      .lean();

    // Check if the task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Find submissions related to the task_id and populate user details
    const submissions = await Submission.find({ task_id })
      .populate("userId", "username email profile_picture") // Populate user details
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    // Transform submissions to include user details
    const transformedSubmissions = submissions.map((submission) => {
      const { userId, ...rest } = submission; // Destructure to separate userId
      return {
        ...rest,
        user: userId, // Rename userId to user
      };
    });

    // Return response with task info and submissions
    res.status(200).json({
      success: true,
      message: "Submissions retrieved successfully",
      classInfo: {
        title: task.title,
        description: task.description,
        class_info: task.class_info,
      },
      submissions: transformedSubmissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to retrieve submissions.",
    });
  }
});

//!complete

//toggling upvotes
app.patch("/api/submissions/upvote",verifyAccessToken, async (req, res) => {
  try {
    const { userId, userType, submissionId } = req.body;
    console.log("🚀 ~ app.patch /api/submissions/upvote:", req.body);

    // Validate inputs
    if (!submissionId || !userId || !userType) {
      return res.status(400).json({
        success: false,
        message: "Submission ID, user ID, and user type are required",
      });
    }

    // Define the upvote field based on userType
    const upvoteField =
      userType === "experts" ? "expert_upvotes" : "user_upvotes";

    // Find the submission by ID
    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Toggle upvote
    const fieldArray = submission[upvoteField];
    const index = fieldArray.indexOf(userId);

    if (index === -1) {
      // User hasn't upvoted yet; add the user ID
      fieldArray.push(userId);
    } else {
      // User already upvoted; remove the user ID
      fieldArray.splice(index, 1);
    }

    // Save the updated submission
    await submission.save();

    res.status(200).json({
      success: true,
      message: `Upvote toggled successfully for ${userType}`,
      data: {
        submissionId: submission._id,
        [upvoteField]: submission[upvoteField],
      },
    });
  } catch (error) {
    console.error("Error toggling upvote:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to toggle upvote.",
    });
  }
});

//Submit an assignment (PDF format).
app.post("/api/submissions",verifyAccessToken, async (req, res) => {
  console.log("req.body of api/submissions: ", req.body);
  try {
    const { task_id, userId, document } = req.body;
    // console.log(req.body);
    // Validate required fields
    if (!task_id || !userId || !document) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: task_id, email, submitted_at, or document",
      });
    }

    // Find the task to get the associated class ID
    const task = await Task.findById(task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    // Find the class associated with the task
    const classDoc = await Class.findOne({ tasks: task_id });

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found for the given task.",
      });
    }

    // Check if the user is a member or expert of the class
    const isAuthorizedUser =
      classDoc.members.includes(userId) || classDoc.experts.includes(userId);

    if (!isAuthorizedUser) {
      return res.status(403).json({
        success: false,
        message:
          "User is not authorized to submit. Only members or experts of the class can submit.",
      });
    }

    // Create a new submission object
    const newSubmission = new Submission({
      task_id,
      userId,
      document,
      feedback: [], // Default to an empty array if not provided
      user_upvotes: [], // Default to an empty array if not provided
      expert_upvotes: [], // Default to an empty array if not provided
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
}); //!complete

//Update an assignment (PDF)
app.patch("/api/submissions",verifyAccessToken, async (req, res) => {
  console.log("req body in side update an assignmet: ", req.body);
  try {
    const { document, submission_id, userId } = req.body; // Get the new values from the request body

    // Find the submission by ID
    const submission = await Submission.findById(submission_id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    // Ensure that the user is the one who made the submission or an admin (optional check)
    if (submission.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this submission.",
      });
    }

    // Update the submission with the new data (only the fields provided will be updated)
    if (document) {
      submission.document = document;
    }

    // Save the updated submission
    const updatedSubmission = await submission.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: "Submission updated successfully.",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to update submission.",
    });
  }
});

//DES: FEEDBACK
app.get("/api/feedbacks",verifyAccessToken, async (req, res) => {
  const { submissionId: submission_id } = req.query;
  console.log("submission id inside api/feedbacks: ", req.query);

  // Check if submissionId is provided
  if (!submission_id) {
    return res.status(400).json({ message: "Submission ID is required" });
  }

  try {
    // Query the database for feedbacks related to submissionId and populate all user details
    const feedbacks = await Feedback.find({ submission_id })
      .populate({
        path: "user_id", // Populate user information
        select: "-password", // Exclude sensitive fields like 'password'
      })
      .exec();

    // If no feedbacks found for the submissionId
    if (!feedbacks || feedbacks.length === 0) {
      return res
        .status(200)
        .json({ message: "No feedbacks found for this submission" });
    }

    // Map feedbacks to replace 'user_id' with 'userInfo' and include all fields
    const formattedFeedbacks = feedbacks.map((feedback) => {
      const feedbackObject = feedback.toObject(); // Convert Mongoose document to plain object
      const userInfo = feedbackObject.user_id; // Extract user info
      delete feedbackObject.user_id; // Remove the 'user_id' field

      return {
        ...feedbackObject, // Include all remaining feedback fields
        userInfo, // Add 'userInfo' field with user details
      };
    });

    // Return feedbacks with user information
    res.status(200).json(formattedFeedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/feedbacks",verifyAccessToken, async (req, res) => {
  const { submission_id, content, user_id } = req.body;
  // console.log("inside post method of feedback ", req.body);
  // Validate input
  if (!submission_id || !content || !user_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Create a new feedback document
    const newFeedback = new Feedback({
      submission_id,
      user_id,
      content,
    });

    // Save the feedback to the database
    const savedFeedback = await newFeedback.save();

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: savedFeedback,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/", async (req, res) => {
  res.send({ message: "Server is running" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
