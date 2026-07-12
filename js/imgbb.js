// js/imgbb.js

// Replace this with your actual ImgBB API key
const IMGBB_API_KEY = "c92716e18fa6b65e124fac58dbfc6751"; 

export async function uploadImageToImgBB(imageFile) {
    if (!imageFile) return null;
    
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.url; // Returns the direct link to the image
        } else {
            throw new Error(data.error.message || "Failed to upload image to ImgBB.");
        }
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        throw error;
    }
}