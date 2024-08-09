import * as Bucket from "@spica-devkit/bucket";
import { env } from "../../6544faf5d71b6e002cf70b78/.build";

const maintenanceFaultsBucketId = env.MAINTENANCE_FAULTS_BUCKET_ID;
const notificationBucketId = env.NOTIFICATION_BUCKET_ID;

function insertNotification(title, description, user) {
    try {
        const notificationContent = {
            title,
            description,
            user
        };

        Bucket.data.insert(notificationBucketId, notificationContent);
        console.log(`Bildirim başarıyla eklendi: ${title}`);
    } catch (error) {
        console.error("Bildirim eklenirken hata oluştu", error);
    }
}

function updateFaultStatus(_id, updateData) {
    try {
        Bucket.data.patch(maintenanceFaultsBucketId, _id, updateData);
        console.log(`Arıza durumu başarıyla güncellendi: ${_id}`);
    } catch (error) {
        console.error("Arıza durumu güncellenirken hata oluştu", error);
    }
}

async function notificationFunction(notificationPeriod, booleanName) {
    Bucket.initialize({ apikey: env.CLIENT_API_KEY });

    const maintenanceFaults = await Bucket.data.getAll(maintenanceFaultsBucketId);
    const now = Date.now();

    for (const fault of maintenanceFaults) {
        const { _id, created_date, is_accepted, is_malfunction } = fault;
        const startTime = new Date(created_date).getTime();
        const timeDifference = now - startTime;

        if (!fault[booleanName] && timeDifference >= (notificationPeriod * 1000)) {
            let notificationMessage = ""
            if (booleanName === "notified") {
                notificationMessage = is_accepted
                    ? "Arıza kabul edildi!"
                    : "Yeni arıza eklendi ama kabul edilmedi.";

                updateFaultStatus(_id, is_accepted ? { notified: true, created_date: new Date().toISOString() } : { notified: true });
            } else if (booleanName === "first_reminder") {
                if (!is_accepted || is_malfunction) continue
                notificationMessage = "Arıza kabul edildi ancak son 1 saat içerisinde arızanın bakımı yapılmadı!"

                updateFaultStatus(_id, { first_reminder: true });

            } else if (booleanName === "second_reminder") {
                if (!is_accepted || is_malfunction) continue
                notificationMessage = "Arıza kabul edildi ancak son 2 saat içerisinde arızanın bakımı yapılmadı!"

                updateFaultStatus(_id, { second_reminder: true });
            }

            insertNotification(`Yeni Arıza: ${_id}`, notificationMessage, "65291d7bffa6b3002d10dceb");
        }
    }
}

export function sendNotification() {
    notificationFunction(600000, "notified") // 10 dk
    notificationFunction(3600000, "first_reminder") // 1 saat
    notificationFunction(7200000, "second_reminder") // 2 saat
}
