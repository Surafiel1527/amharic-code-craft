import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type Language = "en" | "am";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Meta
    "meta.title": "Create Websites in Amharic - AI Website Builder",
    "meta.description": "Build websites and applications in Amharic language. Easy and fast solution using AI technology.",
    
    // Header
    "header.explore": "Explore",
    "header.admin": "Admin",
    "header.settings": "Settings",
    "header.logout": "Logout",
    "header.badge": "Amharic AI Technology - Modern & Smart",
    
    // Hero
    "hero.title": "Create Websites in Amharic",
    "hero.subtitle": "Build your website by chatting with AI or with simple descriptions. Like Lovable and Replit!",
    
    // Examples
    "examples.title": "Examples",
    "examples.coffee": "Coffee Shop Website",
    "examples.coffeePrompt": "Create a beautiful website for my coffee shop. Include coffee images, coffee types and prices, location address, and beautiful design. Use Ethiopian traditional colors.",
    "examples.blog": "Personal Blog",
    "examples.blogPrompt": "Create a personal blog website. Include blog posts, about me section, contact form and social media links. Use modern and clean design.",
    "examples.business": "Business Landing",
    "examples.businessPrompt": "Create a landing page for a small business. Include products section, services, customer reviews, and contact information. Professional and trustworthy design.",
    "examples.portfolio": "Portfolio Website",
    "examples.portfolioPrompt": "Create a portfolio website for an artist or photographer. Include work showcase section, about me, and contact form. Artistic and beautiful design.",
    
    // Tabs
    "tabs.quick": "Quick",
    "tabs.templates": "Templates",
    "tabs.images": "Images",
    "tabs.chat": "Chat",
    "tabs.quickMode": "Quick Mode",
    "tabs.chatMode": "Chat Mode",
    
    // Editor
    "editor.placeholder": "Describe the website you want to create...",
    "editor.generate": "Generate Website",
    "editor.generating": "Generating...",
    "editor.preview": "Preview",
    "editor.copy": "Copy",
    "editor.copied": "Copied",
    "editor.download": "Download",
    "editor.save": "Save",
    
    // AI Features
    "ai.analysis": "Analysis",
    "ai.assistant": "Assistant",
    "ai.versions": "Versions",
    "ai.design": "Design",
    "ai.accessibility": "Accessibility",
    "ai.seo": "SEO",
    "ai.export": "Export",
    "ai.components": "Components",
    "ai.api": "API",
    "ai.analytics": "Analytics",
    "ai.security": "Security",
    "ai.privacy": "Privacy",
    "ai.marketplace": "Marketplace",
    "ai.teams": "Teams",
    "ai.apikeys": "API Keys",
    
    // Projects
    "projects.title": "Your Projects",
    "projects.conversations": "Conversations",
    "projects.new": "New Conversation",
    
    // Save Dialog
    "save.title": "Save Project",
    "save.placeholder": "Project Title",
    "save.saving": "Saving...",
    "save.button": "Save",
    
    // Toasts
    "toast.loginRequired": "Please login",
    "toast.promptRequired": "Please enter a description",
    "toast.noCode": "No generated code",
    "toast.generated": "Website generated successfully!",
    "toast.saved": "Project saved successfully!",
    "toast.copied": "Code copied!",
    "toast.downloaded": "File downloaded!",
    "toast.projectLoaded": "loaded",
    "toast.exampleLoaded": "Example loaded",
    "toast.conversationCreated": "New conversation created",
    "toast.offline": "Connection required",
    "toast.newProject": "New project created",
    "toast.rateLimitTitle": "Too many requests",
    "toast.rateLimitDesc": "Please wait a moment.",
    "toast.paymentRequired": "Payment required",
    "toast.paymentDesc": "Please top up your account.",
    "toast.notAuthorized": "You are not authorized",
    "toast.dataFetchError": "Error fetching data",
    "toast.roleUpdated": "User role updated successfully",
    "toast.roleUpdateError": "Error updating role",
    
    // Sections
    "section.backup": "Backup & Restore",
    "section.usage": "Usage Insights",
    "section.marketplace": "Template Marketplace",
    "section.workspaces": "Team Workspaces",
    "section.apiAccess": "API Access",
    
    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your profile information",
    "settings.backToHome": "Back to Home",
    "settings.fullName": "Full Name",
    "settings.fullNamePlaceholder": "Enter your full name",
    "settings.avatarUrl": "Profile Picture URL",
    "settings.avatarUrlHelp": "Enter your profile picture URL",
    "settings.saveProfile": "Save Profile",
    "settings.saving": "Saving...",
    "settings.noName": "No name",
    "settings.profileSaved": "Profile saved successfully!",
    "settings.profileLoadError": "Failed to load profile information",
    "settings.profileSaveError": "Failed to save profile",
    
    // Backup
    "backup.title": "Backup & Restore",
    "backup.subtitle": "Back up and manage all your projects",
    "backup.currentData": "Current Data",
    "backup.unsaved": "Waiting to be saved...",
    "backup.lastBackup": "Last backup:",
    "backup.createBackup": "Create Backup",
    "backup.restore": "Restore from Backup",
    "backup.selectFile": "Select backup JSON file",
    "backup.chooseFile": "Choose File",
    "backup.importantNotes": "Important Notes:",
    "backup.note1": "Backups contain all project data and code",
    "backup.note2": "Backups save to your device as JSON files",
    "backup.note3": "Restored projects have '(Restored)' in their title",
    "backup.note4": "Restoring does not delete existing projects",
    "backup.selectJsonError": "Please select a backup JSON file",
    "backup.restored": "(Restored)",
    
    // Usage
    "usage.title": "Usage Insights",
    "usage.subtitle": "Monitor your usage and API usage",
    "usage.recentActivity": "Recent Activity",
    "usage.recentProjects": "Recent Projects",
    "usage.today": "Today",
    "usage.week": "Week",
    "usage.month": "Month",
    "usage.totalGenerations": "Total Generations",
    "usage.totalTime": "Total Time",
    "usage.noActivity": "No recorded activity yet",
    
    // Shortcuts
    "shortcuts.title": "Keyboard Shortcuts",
    "shortcuts.description": "Use keyboard shortcuts to improve your workflow",
    "shortcuts.newProject": "New Project",
    "shortcuts.saveProject": "Save Project",
    "shortcuts.copyCode": "Copy Code",
    "shortcuts.aiFeatures": "AI Features",
    "shortcuts.show": "Show Shortcuts",
    
    // Admin
    "admin.title": "Admin Dashboard",
    "admin.subtitle": "System overview and user management",
    "admin.signOut": "Sign Out",
    "admin.totalUsers": "Total Users",
    "admin.totalProjects": "Total Projects",
    "admin.totalConversations": "Total Conversations",
    "admin.usersManagement": "User Management",
    "admin.usersManagementDesc": "View and manage user roles",
    "admin.email": "Email",
    "admin.fullName": "Full Name",
    "admin.registeredDate": "Registered Date",
    "admin.role": "Role",
    "admin.selectRole": "Select Role",
    "admin.roleUser": "User",
    "admin.roleAdmin": "Admin",
    
    // Theme
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
    
    // Preview Mode
    "preview.on": "Preview Mode: ON",
    "preview.off": "Preview Mode: OFF",
    "preview.changesOn": "Changes on:",
    "preview.showing": "Preview Mode: Showing",
    "preview.pendingChanges": "pending change",
    "preview.pendingChangesPlural": "pending changes",
    "preview.navigateTo": "Navigate to",
    "preview.toSee": "to see",
    "preview.those": "those",
    "preview.that": "that",
    "preview.previews": "previews",
    "preview.approveOrReject": "Go to the Self-Modify tab to approve or reject.",
    "preview.goTo": "Go to",
    
    // Insights
    "insights.popularTemplates": "Popular Templates",
    "insights.mostUsedTemplates": "Most used templates",
    "insights.trendingTags": "Trending Tags",
    "insights.mostUsedTags": "Most used tags",
    "insights.platformStats": "Platform Statistics",
    "insights.totalTemplateUsage": "Total Template Usage",
    "insights.totalTags": "Total Tags",
    "insights.loading": "Loading data...",
    "insights.times": "times",
    "insights.projects": "projects",
    
    // AI Assistant
    "aiAssistant.title": "AI Smart Assistant",
    "aiAssistant.subtitle": "Ask about your project, get help, and receive tips",
    "aiAssistant.placeholder": "Ask a question or get help",
    "aiAssistant.send": "Send",
    "aiAssistant.sending": "Sending...",
    
    // Component Library
    "componentLibrary.title": "Component Library",
    "componentLibrary.subtitle": "Insert ready-made components into your project",
    "componentLibrary.search": "Search components...",
    "componentLibrary.category": "Category",
    "componentLibrary.all": "All",
    "componentLibrary.insert": "Insert",
    "componentLibrary.preview": "Preview",
    
    // Featured Gallery
    "featuredGallery.noProjects": "No featured projects yet",
    
    // Privacy Settings
    "privacy.title": "Privacy and Sharing Settings",
    "privacy.subtitle": "Control who can view and access your project",
    "privacy.public": "Public Project",
    "privacy.private": "Private Project",
    "privacy.publicDesc": "Anyone can view this project",
    "privacy.privateDesc": "Only you can view this project",
    "privacy.madePublic": "Project made public",
    "privacy.madePrivate": "Project made private",
    "privacy.linkCopied": "Link copied!",
    "privacy.error": "An error occurred",
    
    // Project Actions
    "projectActions.favorite": "Favorite",
    "projectActions.unfavorite": "Unfavorite",
    "projectActions.share": "Share",
    "projectActions.shareTitle": "Share Project",
    "projectActions.shareDesc": "Use this link to share the project with others",
    
    // Templates Browser
    "templates.fetchError": "Failed to load templates",
    "templates.selected": "template selected",
    "templates.useError": "Failed to use template",
    "templates.search": "Search templates...",
    "templates.all": "All",
    "templates.noTemplates": "No templates found",
    "templates.usage": "usage",
    "templates.useThis": "Use This Template",
    "templates.loaded": "template loaded",
    
    // Chat Interface
    "chat.conversations": "Conversations",
    "chat.generating": "Generating...",
    "chat.createWebsite": "Create Website",
    "chat.saveProject": "Save Project",
    "chat.enterProjectName": "Enter project name",
    "chat.projectName": "Project name",
    "chat.saving": "Saving...",
    "chat.save": "Save",
    "chat.preview": "Preview",
    "chat.copied": "Copied",
    "chat.copy": "Copy",
    "chat.download": "Download",
    "chat.codeOptimized": "Code automatically optimized!",
    "chat.loadFailed": "Failed to load conversation",
    "chat.newConversation": "New conversation",
    "chat.codeUpdated": "Code updated!",
    "chat.sendFailed": "Failed to send message",
    "chat.assistantReady": "Your AI assistant is ready!",
    "chat.assistantDesc": "Describe what you want to build or improve your website in Amharic. For example: 'Create a new landing page for my business' or 'Make the color green'",
    "chat.codeGenerated": "Code generated",
    "chat.thinking": "Thinking...",
    "chat.writeMessage": "Write your message...",
    "chat.websiteAppears": "Your website will appear here",
    
    // AI Features tabs
    "aiFeatures.analysis": "Analysis",
    "aiFeatures.assistant": "Assistant",
    "aiFeatures.versions": "Versions",
    "aiFeatures.design": "Design",
    "aiFeatures.accessibility": "Accessibility",
    "aiFeatures.seo": "SEO",
    "aiFeatures.export": "Export",
    "aiFeatures.components": "Components",
    "aiFeatures.api": "API",
    "aiFeatures.analytics": "Analytics",
    "aiFeatures.security": "Security",
    "aiFeatures.privacy": "Privacy",
    "aiFeatures.marketplace": "Marketplace",
    "aiFeatures.teams": "Teams",
    "aiFeatures.apikeys": "API Keys",
    
    // Explore
    "explore.title": "Explore Public Projects",
    "explore.subtitle": "Discover amazing projects from the community",
    "explore.search": "Search projects...",
    "explore.noProjects": "No projects found",
    "explore.fetchError": "Failed to load projects",
  },
  am: {
    // Meta
    "meta.title": "በአማርኛ ድህረ ገፆችን ይፍጠሩ - AI Website Builder",
    "meta.description": "በአማርኛ ቋንቋ ድህረ ገፆችን እና መተግበሪያዎችን ይፍጠሩ። AI ቴክኖሎጂ የሚጠቀም ቀላል እና ፈጣን መፍትሄ።",
    
    // Header
    "header.explore": "አስስ",
    "header.admin": "አስተዳዳሪ",
    "header.settings": "ማስተካከያ",
    "header.logout": "ውጣ",
    "header.badge": "የአማርኛ AI ቴክኖሎጂ - ዘመናዊ እና ብልህ",
    
    // Templates Browser - Amharic
    "templates.fetchError": "አብነቶችን መጫን አልተቻለም",
    "templates.selected": "አብነት ተመረጠ",
    "templates.useError": "አብነቱን መጠቀም አልተቻለም",
    "templates.search": "አብነቶችን ይፈልጉ...",
    "templates.all": "ሁሉም",
    "templates.noTemplates": "ምንም አብነቶች አልተገኙም",
    "templates.usage": "አጠቃቀም",
    "templates.useThis": "ይህን አብነት ተጠቀም",
    "templates.loaded": "አብነት ተጫነ",
    
    // Chat Interface - Amharic
    "chat.conversations": "ውይይቶች",
    "chat.generating": "በመፍጠር ላይ...",
    "chat.createWebsite": "ድህረ ገፅ ፍጠር",
    "chat.saveProject": "ፕሮጀክት አስቀምጥ",
    "chat.enterProjectName": "የፕሮጀክት ስም ያስገቡ",
    "chat.projectName": "የፕሮጀክት ስም",
    "chat.saving": "በማስቀመጥ ላይ...",
    "chat.save": "አስቀምጥ",
    "chat.preview": "ቅድመ እይታ",
    "chat.copied": "ተቀድቷል",
    "chat.copy": "ቅዳ",
    "chat.download": "አውርድ",
    "chat.codeOptimized": "ኮድ በራስ ተመሻሽሏል!",
    "chat.loadFailed": "ውይይትን መጫን አልተቻለም",
    "chat.newConversation": "አዲስ ውይይት",
    "chat.codeUpdated": "ኮድ ተዘምኗል!",
    "chat.sendFailed": "መልእክት መላክ አልተቻለም",
    "chat.assistantReady": "AI ረዳትዎ ዝግጁ ነው!",
    "chat.assistantDesc": "ድህረ ገፅዎን ለመገንባት ወይም ለማሻሻል የሚፈልጉትን በአማርኛ ይግለጹ። ለምሳሌ፡ \"ለንግዴ አዲስ የማረፊያ ገፅ ፍጠር\" ወይም \"ቀለሙን አረንጓዴ አድርግ\"",
    "chat.codeGenerated": "ኮድ ተፈጥሯል",
    "chat.thinking": "በማሰብ ላይ...",
    "chat.writeMessage": "መልእክትዎን ይፃፉ...",
    "chat.websiteAppears": "የእርስዎ ድህረ ገፅ እዚህ ይታያል",
    
    // AI Features tabs - Amharic
    "aiFeatures.analysis": "ትንተና",
    "aiFeatures.assistant": "ረዳት",
    "aiFeatures.versions": "ስሪቶች",
    "aiFeatures.design": "ዲዛይን",
    "aiFeatures.accessibility": "ተደራሽነት",
    "aiFeatures.seo": "SEO",
    "aiFeatures.export": "ውጤት",
    "aiFeatures.components": "አካላት",
    "aiFeatures.api": "API",
    "aiFeatures.analytics": "ትንታኔ",
    "aiFeatures.security": "ደህንነት",
    "aiFeatures.privacy": "ግላዊነት",
    "aiFeatures.marketplace": "ገበያ",
    "aiFeatures.teams": "ቡድኖች",
    "aiFeatures.apikeys": "API ቁልፎች",
    
    // Hero
    "hero.title": "በአማርኛ ድህረ ገፆችን ይፍጠሩ",
    "hero.subtitle": "AI ጋር በመወያየት ወይም በቀላል መግለጫ ድህረ ገፅዎን ይገንቡ። እንደ Lovable እና Replit!",
    
    // Examples
    "examples.title": "ምሳሌዎች",
    "examples.coffee": "የቡና ቤት ድህረ ገፅ",
    "examples.coffeePrompt": "ለቡና ቤቴ ቆንጆ ድህረ ገፅ ፍጠር። የቡና ምስሎች፣ የቡና አይነቶች እና ዋጋዎች፣ የመገኛ አድራሻ እና የድህረ ገፁ ቆንጆ ዲዛይን ይኑረው። የኢትዮጵያ ባህላዊ ቀለሞችን ተጠቀም።",
    "examples.blog": "የግል ብሎግ",
    "examples.blogPrompt": "ለግል ብሎግ ድህረ ገፅ ፍጠር። የብሎግ ፖስቶች፣ ስለኔ ክፍል፣ የመገናኛ ቅጽ እና ማህበራዊ ሚዲያ አገናኞች ይኑሩት። ዘመናዊ እና ንፁህ ዲዛይን ተጠቀም።",
    "examples.business": "የንግድ ማሳያ ገፅ",
    "examples.businessPrompt": "ለትንሽ ንግድ ማሳያ ገፅ ፍጠር። የምርቶች ክፍል፣ አገልግሎቶች፣ የደንበኛ ግምገማዎች፣ እና የመገናኛ መረጃ ይኑረው። ሙያዊ እና አስተማማኝ ዲዛይን።",
    "examples.portfolio": "የፖርትፎሊዮ ድህረ ገፅ",
    "examples.portfolioPrompt": "ለአርቲስት ወይም ፎቶግራፈር የፖርትፎሊዮ ድህረ ገፅ ፍጠር። የስራ ማሳያ ክፍል፣ ስለኔ፣ እና የመገናኛ ቅጽ። ጥበባዊ እና ውበት ያለው ዲዛይን።",
    
    // Tabs
    "tabs.quick": "ፈጣን",
    "tabs.templates": "አብነቶች",
    "tabs.images": "ምስሎች",
    "tabs.chat": "ውይይት",
    "tabs.quickMode": "ፈጣን ሁነታ",
    "tabs.chatMode": "የውይይት ሁነታ",
    
    // Editor
    "editor.placeholder": "መፍጠር የሚፈልጉትን ድህረ ገፅ ይግለጹ...",
    "editor.generate": "ድህረ ገፅ ፍጠር",
    "editor.generating": "በመፍጠር ላይ...",
    "editor.preview": "ቅድመ እይታ",
    "editor.copy": "ቅዳ",
    "editor.copied": "ተቀድቷል",
    "editor.download": "አውርድ",
    "editor.save": "አስቀምጥ",
    
    // AI Features
    "ai.analysis": "ትንተና",
    "ai.assistant": "ረዳት",
    "ai.versions": "ስሪቶች",
    "ai.design": "ዲዛይን",
    "ai.accessibility": "ተደራሽነት",
    "ai.seo": "SEO",
    "ai.export": "ውጤት",
    "ai.components": "አካላት",
    "ai.api": "API",
    "ai.analytics": "ትንታኔ",
    "ai.security": "ደህንነት",
    "ai.privacy": "ግላዊነት",
    "ai.marketplace": "ገበያ",
    "ai.teams": "ቡድኖች",
    "ai.apikeys": "API ቁልፎች",
    
    // Projects
    "projects.title": "የእርስዎ ፕሮጀክቶች",
    "projects.conversations": "ውይይቶች",
    "projects.new": "አዲስ ውይይት",
    
    // Save Dialog
    "save.title": "ፕሮጀክት አስቀምጥ",
    "save.placeholder": "የፕሮጀክት ስም",
    "save.saving": "በማስቀመጥ ላይ...",
    "save.button": "አስቀምጥ",
    
    // Toasts
    "toast.loginRequired": "እባክዎ ይግቡ",
    "toast.promptRequired": "እባክዎ መግለጫ ያስገቡ",
    "toast.noCode": "ምንም የተፈጠረ ኮድ የለም",
    "toast.generated": "ድህረ ገፅ በተሳካ ሁኔታ ተፈጥሯል!",
    "toast.saved": "ፕሮጀክት በተሳካ ሁኔታ ተቀምጧል!",
    "toast.copied": "ኮድ ተቀድቷል!",
    "toast.downloaded": "ፋይል ወረደ!",
    "toast.projectLoaded": "ተጫነ",
    "toast.exampleLoaded": "ምሳሌ ተጫነ",
    "toast.conversationCreated": "አዲስ ውይይት ተፈጠረ",
    "toast.offline": "ከመስመር ጋር መገናኘት ይፈልጋል",
    "toast.newProject": "አዲስ ፕሮጀክት ተፈጠረ",
    "toast.rateLimitTitle": "በጣም ብዙ ጥያቄዎች",
    "toast.rateLimitDesc": "እባክዎ ትንሽ ይቆዩ።",
    "toast.paymentRequired": "ክፍያ ያስፈልጋል",
    "toast.paymentDesc": "እባክዎ የእርስዎን መለያ ይሙሉ።",
    "toast.notAuthorized": "የአስተዳዳሪ መብት የለዎትም",
    "toast.dataFetchError": "መረጃ በማምጣት ላይ ስህተት ተፈጥሯል",
    "toast.roleUpdated": "የተጠቃሚ ሚና ተቀይሯል",
    "toast.roleUpdateError": "ሚና በመቀየር ላይ ስህተት ተፈጥሯል",
    
    // Sections
    "section.backup": "ምትኪ እና መመለሻ",
    "section.usage": "የአጠቃቀም ግንዛቤዎች",
    "section.marketplace": "የአብነት ገበያ",
    "section.workspaces": "የቡድን ስራ ቦታዎች",
    "section.apiAccess": "API መዳረሻ",
    
    // Settings
    "settings.title": "ማስተካከያዎች",
    "settings.subtitle": "የመገለጫ መረጃዎን ያስተካክሉ",
    "settings.backToHome": "ወደ ቤት",
    "settings.fullName": "ሙሉ ስም",
    "settings.fullNamePlaceholder": "የእርስዎን ሙሉ ስም ያስገቡ",
    "settings.avatarUrl": "የፕሮፋይል ምስል URL",
    "settings.avatarUrlHelp": "የእርስዎን የፕሮፋይል ምስል URL ያስገቡ",
    "settings.saveProfile": "መገለጫ አስቀምጥ",
    "settings.saving": "በማስቀመጥ ላይ...",
    "settings.noName": "ስም የለም",
    "settings.profileSaved": "መገለጫ በተሳካ ሁኔታ ተቀምጧል!",
    "settings.profileLoadError": "የመገለጫ መረጃ ማምጣት አልተቻለም",
    "settings.profileSaveError": "መገለጫ ማስቀመጥ አልተቻለም",
    
    // Backup
    "backup.title": "ምትኪ እና መመለሻ",
    "backup.subtitle": "የእርስዎን ሁሉንም ፕሮጀክቶች ምትኪ ያድርጉ እና ያደራጁ",
    "backup.currentData": "የአሁኑ ዳታ",
    "backup.unsaved": "መቀመጥ እየተጠበቀ ነው...",
    "backup.lastBackup": "የመጨረሻ ምትኪ:",
    "backup.createBackup": "ምትኪ ፍጠር",
    "backup.restore": "ከምትኪ መልስ",
    "backup.selectFile": "የምትኪ JSON ፋይልን ይምረጡ",
    "backup.chooseFile": "ፋይል ምረጥ",
    "backup.importantNotes": "አስፈላጊ ማስታወሻዎች:",
    "backup.note1": "ምትኪዎች ሁሉንም የፕሮጀክት ውሂብ እና ኮድ ይይዛሉ",
    "backup.note2": "ምትኪዎች በእርስዎ መሳሪያ ላይ እንደ JSON ፋይሎች ይቀመጣሉ",
    "backup.note3": "የተመለሱ ፕሮጀክቶች በርዕስ ላይ '(የተመለሰ)' ያላቸው ናቸው",
    "backup.note4": "መመለስ የነባር ፕሮጀክቶችን አያጠፋም",
    "backup.selectJsonError": "እባክዎ የምትኪ JSON ፋይል ይምረጡ",
    "backup.restored": "(የተመለሰ)",
    
    // Usage
    "usage.title": "የአጠቃቀም ግንዛቤዎች",
    "usage.subtitle": "የእርስዎን አጠቃቀም እና የ API አጠቃቀም ይከታተሉ",
    "usage.recentActivity": "የቅርብ ጊዜ እንቅስቃሴ",
    "usage.recentProjects": "የቅርብ ፕሮጀክቶች",
    "usage.today": "ዛሬ",
    "usage.week": "ሳምንት",
    "usage.month": "ወር",
    "usage.totalGenerations": "ጠቅላላ ፍጥረቶች",
    "usage.totalTime": "ጠቅላላ ጊዜ",
    "usage.noActivity": "ገና የተቀዳ እንቅስቃሴ የለም",
    
    // Shortcuts
    "shortcuts.title": "የቁልፍ ቦርድ አቋራጮች",
    "shortcuts.description": "ፈጣን አሰራርን ለማሻሻል የቁልፍ ቦርድ አቋራጮችን ይጠቀሙ",
    "shortcuts.newProject": "አዲስ ፕሮጀክት",
    "shortcuts.saveProject": "ፕሮጀክት አስቀምጥ",
    "shortcuts.copyCode": "ኮድ ቅዳ",
    "shortcuts.aiFeatures": "AI ባህሪያት",
    "shortcuts.show": "አቋራጮች አሳይ",
    
    // Admin
    "admin.title": "የአስተዳዳሪ ዳሽቦርድ",
    "admin.subtitle": "የስርዓት አጠቃላይ እይታ እና የተጠቃሚ አስተዳደር",
    "admin.signOut": "ውጣ",
    "admin.totalUsers": "ጠቅላላ ተጠቃሚዎች",
    "admin.totalProjects": "ጠቅላላ ፕሮጀክቶች",
    "admin.totalConversations": "ጠቅላላ ውይይቶች",
    "admin.usersManagement": "የተጠቃሚዎች አስተዳደር",
    "admin.usersManagementDesc": "የተጠቃሚዎችን ሚናዎች ይመልከቱ እና ያስተዳድሩ",
    "admin.email": "ኢሜል",
    "admin.fullName": "ሙሉ ስም",
    "admin.registeredDate": "የተመዘገበበት ቀን",
    "admin.role": "ሚና",
    "admin.selectRole": "ሚና ይምረጡ",
    "admin.roleUser": "ተጠቃሚ",
    "admin.roleAdmin": "አስተዳዳሪ",
    
    // Theme
    "theme.light": "ብርሃን",
    "theme.dark": "ጨለማ",
    "theme.system": "ስርዓት",
    
    // Preview Mode
    "preview.on": "የቅድመ እይታ ሁነታ: ከፍቷል",
    "preview.off": "የቅድመ እይታ ሁነታ: ዝግ",
    "preview.changesOn": "ለውጦች በ:",
    "preview.showing": "የቅድመ እይታ ሁነታ: በማሳየት ላይ",
    "preview.pendingChanges": "እየተጠበቀ ያለ ለውጥ",
    "preview.pendingChangesPlural": "እየተጠበቁ ያሉ ለውጦች",
    "preview.navigateTo": "ወደ",
    "preview.toSee": "ለማየት",
    "preview.those": "እነዚያ",
    "preview.that": "ያ",
    "preview.previews": "ቅድመ እይታዎች",
    "preview.approveOrReject": "ለማጽደቅ ወይም ለመቀበል ወደ የራስ-ማስተካከያ ትር ይሂዱ።",
    "preview.goTo": "ወደ",
    
    // Insights
    "insights.popularTemplates": "ታዋቂ ቅንብሮች",
    "insights.mostUsedTemplates": "በብዛት ጥቅም ላይ የዋሉ ቅንብሮች",
    "insights.trendingTags": "የግል ምልክቶች",
    "insights.mostUsedTags": "በብዛት ጥቅም ላይ የዋሉ መለያዎች",
    "insights.platformStats": "የመድረክ ስታቲስቲክስ",
    "insights.totalTemplateUsage": "ጠቅላላ ቅንብር አጠቃቀም",
    "insights.totalTags": "ጠቅላላ መለያዎች",
    "insights.loading": "መረጃ እየተጫነ ነው...",
    "insights.times": "ጊዜ",
    "insights.projects": "ፕሮጀክቶች",
    
    // AI Assistant
    "aiAssistant.title": "AI አስተዋይ ረዳት",
    "aiAssistant.subtitle": "ስለ ፕሮጀክትዎ ይጠይቁ፣ እገዛ ያግኙ፣ እና ምክሮችን ይቀበሉ",
    "aiAssistant.placeholder": "ጥያቄ ይጠይቁ ወይም እገዛ ያግኙ",
    "aiAssistant.send": "ላክ",
    "aiAssistant.sending": "በመላክ ላይ...",
    
    // Component Library
    "componentLibrary.title": "የአካላት ቤተ-መዛግብት",
    "componentLibrary.subtitle": "ወደ ፕሮጀክትዎ የተዘጋጁ አካላትን ያስገቡ",
    "componentLibrary.search": "አካላትን ይፈልጉ...",
    "componentLibrary.category": "ምድብ",
    "componentLibrary.all": "ሁሉም",
    "componentLibrary.insert": "አስገባ",
    "componentLibrary.preview": "ቅድመ እይታ",
    
    // Featured Gallery
    "featuredGallery.noProjects": "ገና ምንም የተለይ ፕሮጀክት የለም",
    
    // Privacy Settings
    "privacy.title": "የግላዊነት እና የማጋራት ቅንብሮች",
    "privacy.subtitle": "ፕሮጀክትዎን ማን ማየት እና መድረስ እንደሚችል ይቆጣጠሩ",
    "privacy.public": "ይፋ ፕሮጀክት",
    "privacy.private": "የግል ፕሮጀክት",
    "privacy.publicDesc": "ማንኛውም ሰው ይህንን ፕሮጀክት ማየት ይችላል",
    "privacy.privateDesc": "እርስዎ ብቻ ይህንን ፕሮጀክት ማየት ይችላሉ",
    "privacy.madePublic": "ፕሮጀክት ይፋ ሆነ",
    "privacy.madePrivate": "ፕሮጀክት የግል ሆነ",
    "privacy.linkCopied": "አገናኝ ተቀድቷል!",
    "privacy.error": "ስህተት ተከስቷል",
    
    // Project Actions
    "projectActions.favorite": "አስተወድድ",
    "projectActions.unfavorite": "ተወዳጅ",
    "projectActions.share": "አጋራ",
    "projectActions.shareTitle": "ፕሮጀክት አጋራ",
    "projectActions.shareDesc": "ፕሮጀክቱን ለሌሎች ለማጋራት ይህንን አገናኝ ይጠቀሙ",
    
    // Explore
    "explore.title": "ይፋዊ ፕሮጀክቶችን አስስ",
    "explore.subtitle": "ከማህበረሰቡ አስደናቂ ፕሮጀክቶችን ያግኙ",
    "explore.search": "ፕሮጀክቶችን ፈልግ...",
    "explore.noProjects": "ምንም ፕሮጀክት አልተገኘም",
    "explore.fetchError": "ፕሮጀክቶችን ማምጣት አልተቻለም",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved === "en" || saved === "am") ? saved : "en"; // Default to English
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.setAttribute("lang", language);
    
    // Update document title and meta tags
    const title = translations[language]["meta.title"];
    const description = translations[language]["meta.description"];
    
    document.title = title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }
    
    // Update Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", title);
    }
    
    // Update Open Graph description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute("content", description);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations["en"]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
