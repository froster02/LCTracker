import { registerMessageRouter } from "./message-router.js";
import { registerAlarms } from "./alarms.js";
import { registerReviewReminder } from "./review-reminder.js";

registerMessageRouter();
registerAlarms();
registerReviewReminder();
