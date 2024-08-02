const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const cors = require("cors");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  Tesseract.recognize(req.file.buffer, "eng", {
    logger: (m) => console.log(m),
  })
    .then(({ data: { text } }) => {
      const extractedData = processText(text);
      res.json(extractedData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error processing image.");
    });
});

const processText = (text) => {
  const extractedData = {};
  const lines = text.split("\n");
  let foundExpireDate = false;
  lines.forEach((line) => {
    console.log("Processing line:", line); // Debugging line

    let match;

    // Match and clean NAME field
    match = line.match(/\bname\b\s*[:=]?\s*(.+)/i);
    if (match) {
      console.log("Matched Name:", match[1]); // Debugging line
      extractedData["Name"] = cleanText(match[1], /[^a-zA-Z\s]/g);
    }
    // Match and clean ID field
    match = line.match(/\b(?:id|id number|student id)\b\s*[:=]?\s*(.+)/i);
    if (match) {
      console.log("Matched ID:", match[1]); // Debugging line
      extractedData["ID"] = cleanText(match[1], /[^0-9-]/g);
    }
    // Match and clean D.O.B. field
    match = line.match(/D.O.B\s*[:=]\s*(.+)/i);
    if (match) {
      console.log("Matched D.O.B.:", match[1]); // Debugging line
      extractedData["D.O.B."] = cleanDateText(match[1]);
    }

    // Match and clean GRADE/YEAR field
    match = line.match(/\b(?:grade|year)\b\s*[:=]?\s*(.+)/i);
    if (match) {
      console.log("Matched Grade/Year:", match[1]); // Debugging line
      extractedData["Grade/Year"] = cleanText(match[1], /[^a-zA-Z0-9\s]/g);
    }
    // Match and clean ISSUED ON field
    match = line.match(/\b(?:issued on|issue date)\b\s*[:=]?\s*(.+)/i);
    if (match) {
      console.log("Matched Issued On:", match[1]); // Debugging line
      extractedData["Issued On"] = cleanDateText(match[1]);
    }

    // Match and clean ADDRESS field
    match = line.match(/\b(?:address)\b\s*[:=]?\s*(.+)/i);
    if (match) {
      console.log("Matched Address:", match[1]); // Debugging line
      extractedData["Address"] = cleanText(match[1], /[^a-zA-Z0-9\s,]/g);
    }

    // Match and clean EXPIRE DATE field
    match = line.match(/(?:expire date|valid until|valid to)\s*[:=]\s*(.+)/i);
    if (match) {
      console.log("Matched Expire Date:", match[1]); // Debugging line
      extractedData["Expire Date"] = cleanDateText(match[1]);
      foundExpireDate = true;
    }
    // Match and clean DATE OF BIRTH field
    match = line.match(/date of birth\s*[:=]\s*(.+)/i);
    if (match) {
      console.log("Matched Date of Birth:", match[1]); // Debugging line
      extractedData["Date of Birth"] = cleanDateText(match[1]);
    } else {
      // Match and clean DATE field only if not already matched as "Expire Date"
      if (!foundExpireDate) {
        match = line.match(/date\s*[:=]\s*(.+)/i);
        if (match) {
          console.log("Matched Date:", match[1]); // Debugging line
          extractedData["Date"] = cleanDateText(match[1]);
        }
      }
    }
  });

  return extractedData;
};

const cleanText = (text, pattern) => {
  return text.replace(pattern, "").trim();
};

const cleanDateText = (text) => {
  // Handle dates in formats like "November 23, 1992" or "23/11/1992"
  return text.replace(/[^a-zA-Z0-9\s,/-]/g, "").trim();
};

const PORT = process.env.PORT || 3400;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
