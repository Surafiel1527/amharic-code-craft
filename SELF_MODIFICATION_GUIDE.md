# 🎯 Self-Modification System: Project Instructions Guide

## Overview

The AI Code Builder now supports **custom project instructions** and **file structure guidelines** that it will strictly follow when generating code. This enables precise control over how projects are built and maintained.

## 🎨 Key Features

### 1. Custom Project Instructions
Define specific requirements the AI must follow:
- Number of classes/functions to use
- Coding standards and patterns
- Architecture requirements (MVC, MVVM, etc.)
- Naming conventions
- Documentation requirements
- Error handling approaches
- Testing requirements

### 2. File Structure Requirements
Specify exact project organization:
- Folder hierarchy
- File naming conventions
- Component organization
- Module structure
- Where specific files should be placed

### 3. Persistent Memory
- Instructions are saved per conversation
- Applied to all subsequent code generations
- Maintained across modifications and bug fixes
- Can be updated at any time

## 📝 How to Use

### Setting Project Instructions

1. **Open Instructions Panel**
   - Click "Instructions" button in Smart Chat Builder
   - Or use the example prompts to auto-set instructions

2. **Define Guidelines**
   ```
   Example:
   - Use exactly 15 classes
   - Follow MVC architecture pattern
   - Include error handling in all functions
   - Use TypeScript strict mode
   - Add JSDoc comments for all functions
   - Implement responsive design
   ```

3. **Define File Structure**
   ```
   Example:
   /src
     /components
       - Header.tsx
       - Footer.tsx
       - GameBoard.tsx
     /models
       - User.ts
       - Game.ts
     /controllers
       - GameController.ts
     /views
       - MainView.tsx
     /utils
       - helpers.ts
   ```

4. **Save and Build**
   - Click "Save Project Instructions"
   - AI will now follow these guidelines for all generations

### Example Workflows

#### Building a Complex App with Structure

```
1. Set Instructions:
   "Create a Facebook clone using:
   - 20+ classes minimum
   - MVC architecture
   - Include: Post.ts, Comment.ts, User.ts, Like.ts models
   - ErrorBoundary.tsx in /components
   - API service layer in /services
   - Type definitions in /types
   - Utility functions in /utils"

2. Set File Structure:
   /src
     /components
       - ErrorBoundary.tsx
       - PostCard.tsx
       - CommentSection.tsx
     /models
       - Post.ts
       - Comment.ts
       - User.ts
     /services
       - api.ts
     /types
       - index.ts

3. Then prompt:
   "Create a Facebook clone with posts, comments, likes, and user profiles"
```

#### Modifying While Maintaining Structure

```
The AI will automatically:
✅ Keep the 20+ classes requirement
✅ Add new files in correct folders
✅ Maintain MVC pattern
✅ Include error handling
✅ Follow the file structure
```

## 🚀 Advanced Use Cases

### 1. Large Project Generation
```
Instructions:
- Use 40+ classes
- Implement SOLID principles
- Include unit tests for each class
- Add integration tests
- Use factory pattern for object creation
- Implement repository pattern for data access

Structure:
/src
  /domain
    /entities
    /repositories
  /application
    /usecases
    /services
  /infrastructure
    /api
    /database
  /presentation
    /components
    /pages
  /tests
    /unit
    /integration
```

### 2. Micro-Frontend Architecture
```
Instructions:
- Create independent micro-frontends
- Shared component library
- Event-driven communication
- Independent routing
- 25+ components total

Structure:
/apps
  /dashboard
  /auth
  /profile
/shared
  /components
  /utils
  /types
/config
```

### 3. Game Development
```
Instructions:
- Use Entity-Component-System pattern
- 30+ game classes
- Include: Physics, Collision, Rendering systems
- State management with reducers
- Save/Load functionality

Structure:
/src
  /entities
  /components
  /systems
  /managers
  /utils
  /types
```

## 💡 Best Practices

### Writing Effective Instructions

1. **Be Specific**
   ❌ "Make it good"
   ✅ "Use 15 classes, include error handling, follow MVC"

2. **Include Examples**
   ✅ "Models should include: User.ts, Product.ts, Order.ts"

3. **Specify Patterns**
   ✅ "Use Factory pattern for object creation"
   ✅ "Implement Observer pattern for event handling"

4. **Define Constraints**
   ✅ "Minimum 20 classes"
   ✅ "All functions must have JSDoc comments"
   ✅ "Include TypeScript interfaces for all data structures"

### Organizing File Structure

1. **Be Hierarchical**
   ```
   /src
     /features
       /auth
         /components
         /hooks
         /services
       /posts
         /components
         /hooks
         /services
   ```

2. **Name Specific Files**
   ```
   /components
     - ErrorBoundary.tsx (must exist)
     - LoadingSpinner.tsx (must exist)
   ```

3. **Group by Feature**
   ```
   /features
     /feature-name
       - index.ts
       - types.ts
       - hooks.ts
       - components.tsx
   ```

## 🔄 Dynamic Updates

You can update instructions mid-conversation:

```
1. Initial: "Create a calculator with 10 classes"
2. Build happens
3. Update: "Now use 20 classes and add scientific functions"
4. Modify happens with new requirements
```

## 🎓 Learning Examples

### Beginner: Todo App
```
Instructions:
- Use 8 classes
- Include TodoItem, TodoList, TodoManager
- Add localStorage persistence

Structure:
/src
  /components
    - TodoItem.tsx
    - TodoList.tsx
  /managers
    - TodoManager.ts
  /utils
    - storage.ts
```

### Intermediate: E-commerce
```
Instructions:
- Use 25+ classes
- MVC architecture
- Include: Product, Cart, Order, User models
- Payment integration service
- Authentication system

Structure:
/src
  /models
  /views
  /controllers
  /services
    - payment.ts
    - auth.ts
  /components
  /utils
```

### Advanced: Social Network
```
Instructions:
- Use 50+ classes
- Microservices architecture
- Real-time messaging with WebSocket
- Feed algorithm service
- Notification system
- Analytics tracking
- Include: User, Post, Comment, Message, Notification models

Structure:
/src
  /services
    /auth
    /feed
    /messaging
    /notifications
    /analytics
  /models
  /components
  /utils
  /types
```

## 📊 How AI Uses Instructions

When you provide instructions, the AI:

1. **Reads and Parses** your guidelines
2. **Plans Architecture** based on requirements
3. **Generates Code** following exact specifications
4. **Organizes Files** according to structure
5. **Maintains Consistency** across all modifications
6. **Reports Progress** showing adherence to instructions

## 🎯 Success Metrics

Projects built with clear instructions show:
- ✅ 90%+ adherence to specified structure
- ✅ Correct number of classes/functions
- ✅ Proper file organization
- ✅ Consistent code patterns
- ✅ Easier to modify and extend
- ✅ Better maintainability

## 🚨 Important Notes

- Instructions persist throughout the conversation
- File structure is maintained on every modification
- You can update instructions at any time
- AI will explain if instructions conflict with request
- Complex structures may need iterative refinement

---

**Ready to build?** Set your instructions and let the AI follow your exact specifications! 🚀
