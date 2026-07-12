import { registerMessageRouter } from "./message-router.js";
import { registerAlarms } from "./alarms.js";
import { registerReviewReminder } from "./review-reminder.js";
import { registerAuthMessageListener } from "./auth.js";

registerMessageRouter();
registerAlarms();
registerReviewReminder();
registerAuthMessageListener();
