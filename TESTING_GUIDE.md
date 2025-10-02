# 🧪 AI System Testing Guide

## Access the Test Suite

**Admin-Only Access**: Navigate to `/ai-test`

This page is restricted to administrators for testing and monitoring purposes.

---

## 🏢 For Regular Users

**User Interface**: Navigate to `/builder`

This is your main code generation interface with:
- Smart Chat Builder
- AI-powered multi-file generation
- Example prompts and guidance
- Integrated version control (snapshots)

**No testing needed** - just start building! The self-healing system works automatically in the background.

---

## 👨‍💼 For Administrators

### Access Points

1. **Main Monitoring**: `/admin` → "Self-Healing" tab
2. **Test Suite**: `/ai-test` (link in admin panel)
3. **User Builder**: `/builder` (same as regular users see)

---

## 🛡️ Feature 1: Self-Healing System

### What It Does
- Automatically detects runtime errors
- Generates AI-powered fixes with confidence scores
- Auto-applies high-confidence fixes (≥80%)
- Verifies fixes before applying
- Rolls back failed fixes automatically

### How to Test

1. **Open the AI Builder tab** in the test suite
2. **Click the Activity icon** (⚡) in the top-right of Smart Chat Builder
3. **Generate some code** that might have errors (intentionally)
4. **Check the Self-Healing Monitor** for:
   - Detected errors list
   - Generated fixes with confidence scores
   - Applied fixes status
   - Verification results

### Expected Results
✅ Errors appear in the monitor  
✅ Fixes are generated with confidence %  
✅ High-confidence fixes auto-apply  
✅ Health status updates in real-time  
✅ Failed fixes roll back automatically

### Test Scenarios
- Generate code with syntax errors
- Create database queries with wrong table names
- Add API calls to non-existent endpoints
- Use undefined variables or functions

---

## 🗂️ Feature 2: Multi-File Generation

### What It Does
- Generates multiple organized files in a single request
- Maintains consistent code style across files
- Follows project structure guidelines
- Creates proper file organization

### How to Test

1. **Open the AI Builder tab**
2. **Try these example prompts:**

```
"Create a complete authentication system with:
- Login component
- Signup component  
- useAuth hook
- auth types
- API utilities"
```

```
"Build a dashboard with:
- Sidebar navigation component
- Header component
- 3 different chart widgets
- Dashboard page that uses all of them"
```

```
"Generate a todo app with:
- TodoList component
- TodoItem component
- useTodos hook
- Todo types
- API functions"
```

3. **Verify the response** includes multiple file paths
4. **Check file organization** matches structure

### Expected Results
✅ Multiple files generated in one response  
✅ Proper directory structure (components/, hooks/, types/, utils/)  
✅ Consistent naming conventions  
✅ Code works together as a complete feature  
✅ Follows custom instructions if set

---

## 📦 Feature 3: Version Control & Snapshots

### What It Does
- **Auto-versions**: Created on every significant change
- **Manual snapshots**: User-created save points with screenshots
- **One-click restore**: Revert to any previous state
- **Visual previews**: See what each version looked like

### How to Test

#### Manual Snapshots

1. **Generate some code** in the AI Builder
2. **Click the Save icon** (💾) in the top-right
3. **Create a snapshot:**
   - Give it a name: "Working Login System"
   - Add description: "Auth system before adding profiles"
   - Click "Save Snapshot"
4. **Make more changes** to the code
5. **Open snapshots again**
6. **Click "Restore"** on your saved snapshot
7. **Verify** code reverts to snapshot state

#### Auto-Versions

1. Check the version history for your project
2. Verify versions are created automatically
3. Try restoring to a previous auto-version

### Expected Results
✅ Snapshots are created with screenshots  
✅ Restore works correctly  
✅ Auto-versions created on changes  
✅ Version history is accessible  
✅ Can delete old snapshots

---

## 🧠 Project Memory & Custom Instructions

### Additional Feature to Test

1. **Click the Settings icon** (⚙️) in Smart Chat Builder
2. **Add Custom Instructions:**
```
Project Structure:
- Use TypeScript strict mode
- Place all components in src/components/
- Use functional components with hooks
- Follow atomic design principles

Code Standards:
- Use named exports
- Add JSDoc comments to functions
- Use const for immutable values
- Implement error boundaries
```

3. **Add File Structure:**
```
src/
  components/
    common/     (shared UI components)
    features/   (feature-specific components)
    layout/     (page layout components)
  hooks/        (custom React hooks)
  types/        (TypeScript type definitions)
  utils/        (utility functions)
  api/          (API call functions)
```

4. **Generate code** and verify it follows your instructions

---

## 🎯 Complete Testing Checklist

### Self-Healing System
- [ ] Open Self-Healing Monitor
- [ ] Error detection works
- [ ] Fixes generated with confidence
- [ ] High-confidence fixes auto-apply
- [ ] Verification runs before applying
- [ ] Health status indicator updates
- [ ] Failed fixes roll back
- [ ] Error patterns are learned

### Multi-File Generation
- [ ] Generate auth system (multiple files)
- [ ] Generate dashboard (multiple files)
- [ ] Generate CRUD feature (multiple files)
- [ ] Files organized correctly
- [ ] Code is consistent across files
- [ ] Follows custom instructions
- [ ] Maintains file structure requirements

### Version Control
- [ ] Create manual snapshot
- [ ] Screenshot captured correctly
- [ ] Add name and description
- [ ] Make code changes
- [ ] Restore snapshot successfully
- [ ] Auto-versions are created
- [ ] Version history accessible
- [ ] Delete snapshot works

### Integration Tests
- [ ] All three features work together
- [ ] Custom instructions persist
- [ ] Memory system tracks changes
- [ ] Health monitoring runs in background
- [ ] No conflicts between features

---

## 🐛 Troubleshooting

### If Self-Healing Monitor shows no errors:
- It means no errors have been detected yet (which is good!)
- Try generating intentionally broken code to test
- Check console for any error messages

### If Multi-File Generation returns single file:
- Make your prompt more explicit about needing multiple files
- Example: "Generate separate files for..."
- Mention specific file types needed

### If Snapshots don't capture screenshots:
- Ensure html2canvas library is loaded
- Check browser console for errors
- Try with simpler content first

### If Version Control doesn't restore:
- Check that you have permissions
- Verify the snapshot ID is valid
- Look for error messages in console

---

## 📚 Documentation

For more details, see:
- `SELF_MODIFICATION_ARCHITECTURE.md` - Complete system architecture
- `ENHANCED_MEMORY_SYSTEM.md` - Memory system details
- `SELF_HEALING_SYSTEM.md` - Self-healing implementation
- `ENHANCED_SELF_HEALING.md` - Advanced self-healing features

---

## ✅ Success Criteria

The system is working correctly if:

1. **Self-Healing**: Errors are detected and fixed automatically with minimal user intervention
2. **Multi-File**: Complex features generate complete, organized, working code across multiple files
3. **Version Control**: Can safely experiment knowing you can always revert to any previous state

---

## 🎉 Next Steps After Testing

Once all features are verified:

1. Start building your actual project
2. Let the system learn from your coding patterns
3. Create snapshots before major changes
4. Monitor the self-healing dashboard periodically
5. Update custom instructions as needed

**Happy Testing! 🚀**
