PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, clientName TEXT NOT NULL, projectName TEXT NOT NULL,
 slug TEXT NOT NULL UNIQUE, clientEmail TEXT NOT NULL DEFAULT '', clientPhone TEXT NOT NULL DEFAULT '',
 previewUrl TEXT NOT NULL, productionUrl TEXT NOT NULL DEFAULT '', repositoryUrl TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('Planning','Building','Client Review','Changes Requested','Approved','Live','Archived')),
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
 id TEXT PRIMARY KEY, projectId TEXT NOT NULL REFERENCES projects(id), name TEXT NOT NULL,
 message TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('New','In Progress','Resolved')), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity (
 id TEXT PRIMARY KEY, projectId TEXT NOT NULL REFERENCES projects(id), message TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (tokenHash TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS feedback_project ON feedback(projectId);
CREATE INDEX IF NOT EXISTS activity_project ON activity(projectId);
