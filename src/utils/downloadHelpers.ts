/**
 * Download HTML file to user's computer
 */
export const downloadHTML = (htmlContent: string, filename: string = "website.html") => {
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy HTML to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

/**
 * Share generated website (Web Share API)
 */
export const shareWebsite = async (htmlContent: string, title: string = "My Website") => {
  if (!navigator.share) {
    throw new Error("Web Share API not supported");
  }

  try {
    const file = new File([htmlContent], "website.html", { type: "text/html" });
    await navigator.share({
      title: title,
      text: "Check out the website I built with AI!",
      files: [file],
    });
    return true;
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error("Error sharing:", error);
    }
    return false;
  }
};
