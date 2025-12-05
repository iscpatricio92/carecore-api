# Contribution Guide - CareCore API

This guide establishes the rules and conventions for contributing to the project.

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

- **`feat`**: New feature
- **`fix`**: Bug fix
- **`docs`**: Documentation changes
- **`style`**: Formatting changes (spaces, commas, etc.) that don't affect code
- **`refactor`**: Code refactoring without changing functionality
- **`perf`**: Performance improvements
- **`test`**: Adding or modifying tests
- **`build`**: Build system changes, dependencies, etc.
- **`ci`**: CI/CD changes
- **`chore`**: Maintenance tasks
- **`revert`**: Revert a previous commit

### Scope (Optional)

The scope indicates the affected code area. Examples:
- `auth`: Authentication
- `patients`: Patients module
- `fhir`: FHIR resources
- `db`: Database
- `config`: Configuration

### Examples

```bash
# New feature
git commit -m "feat(patients): add endpoint to search patients by name"

# Bug fix
git commit -m "fix(auth): fix JWT expired token validation"

# Documentation
git commit -m "docs: update Docker configuration guide"

# Refactoring
git commit -m "refactor(fhir): simplify resource validation logic"

# With body and footer
git commit -m "feat(patients): add advanced search filters

Allows searching patients by multiple criteria:
- Full name
- Date of birth
- National identifier

Closes #123"
```

### Rules

- ✅ Type must be lowercase
- ✅ Scope (if exists) must be lowercase
- ✅ Description must start with lowercase
- ✅ Description must not end with a period
- ✅ Description must have a maximum of 100 characters
- ✅ Complete header must have a maximum of 100 characters
- ❌ Don't use `WIP`, `fixup`, `squash` in the main message

## 🌿 Branch Conventions

### Format

```
<type>/<description>
```

### Branch Types

- **`feature/`**: New feature
- **`fix/`**: Bug fix
- **`hotfix/`**: Urgent production fix
- **`docs/`**: Documentation changes
- **`refactor/`**: Refactoring
- **`test/`**: Adding or improving tests
- **`chore/`**: Maintenance tasks

### Examples

```bash
# Feature
feature/patient-search
feature/auth-jwt-implementation

# Fix
fix/database-connection-timeout
fix/fhir-resource-validation

# Hotfix
hotfix/security-patch-cve-2024

# Docs
docs/api-documentation-update

# Refactor
refactor/database-config-module
```

### Rules

- ✅ Use lowercase
- ✅ Separate words with hyphens (`-`)
- ✅ Be descriptive but concise
- ✅ Don't use special characters
- ❌ Don't use spaces
- ❌ Don't use uppercase

## 🔄 Workflow

### 1. Create Branch

```bash
# From updated main
git checkout main
git pull origin main

# Create new branch
git checkout -b feature/feature-name
```

### 2. Make Changes

- Write clean code
- Follow project code conventions
- Add tests if necessary
- Update documentation if necessary

### 3. Commit

```bash
# Add changes
git add .

# Commit with conventional message
git commit -m "feat(scope): change description"
```

The pre-commit hook will automatically run:
- Formatting with Prettier
- ESLint fixes
- Unit tests with coverage
- E2E tests (authentication, authorization, protected endpoints)
- Commit message validation

### 4. Push and Pull Request

```bash
# Push branch
git push origin feature/feature-name
```

Then create a Pull Request on GitHub/GitLab with:
- Descriptive title
- Description of changes
- References to related issues (if applicable)

## ✅ Pre-PR Checklist

- [ ] Code formatted (applied automatically)
- [ ] No ESLint errors (fixed automatically)
- [ ] Commit message follows conventions (validated automatically)
- [ ] Unit tests pass: `npm test` (run automatically in pre-commit)
- [ ] E2E tests pass: `npm run test:e2e` (run automatically in pre-commit)
- [ ] Documentation updated (if applicable)
- [ ] No debug console.logs
- [ ] No unnecessary commented code

## 🚫 What NOT to Do

- ❌ Commits with generic messages like "fix", "update", "changes"
- ❌ Branches with names like `fix1`, `test`, `new-feature`
- ❌ Commits that mix multiple unrelated changes
- ❌ Direct push to `main` or `develop`
- ❌ Commits that break the build or tests

## 📚 Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
