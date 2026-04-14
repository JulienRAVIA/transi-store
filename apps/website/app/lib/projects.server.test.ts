import { describe, it, expect, vi, beforeEach } from "vitest";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createProjectTag,
  type TestDb,
} from "../../tests/test-db";
import {
  addTagToProject,
  removeTagFromProject,
  getProjectTags,
  getProjectsForOrganization,
} from "./projects.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("Project Tags", () => {
  let db: TestDb;
  let orgId: number;
  let projectId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    orgId = org.id;
    const project = await createProject(db, orgId);
    projectId = project.id;
  });

  describe("addTagToProject", () => {
    it("adds a tag to a project", async () => {
      const tag = await addTagToProject(projectId, "frontend");

      expect(tag.name).toBe("frontend");
      expect(tag.projectId).toBe(projectId);
    });

    it("trims whitespace from tag name", async () => {
      const tag = await addTagToProject(projectId, "  frontend  ");

      expect(tag.name).toBe("frontend");
    });

    it("allows multiple tags on the same project", async () => {
      await addTagToProject(projectId, "frontend");
      await addTagToProject(projectId, "mobile");

      const tags = await getProjectTags(projectId);
      expect(tags).toHaveLength(2);
      expect(tags.map((t) => t.name).sort()).toEqual(["frontend", "mobile"]);
    });

    it("rejects duplicate tags on the same project", async () => {
      await addTagToProject(projectId, "frontend");

      await expect(addTagToProject(projectId, "frontend")).rejects.toThrow();
    });
  });

  describe("removeTagFromProject", () => {
    it("removes a tag from a project", async () => {
      await addTagToProject(projectId, "frontend");
      await addTagToProject(projectId, "mobile");

      await removeTagFromProject(projectId, "frontend");

      const tags = await getProjectTags(projectId);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("mobile");
    });

    it("does nothing when removing a non-existent tag", async () => {
      await removeTagFromProject(projectId, "nonexistent");

      const tags = await getProjectTags(projectId);
      expect(tags).toHaveLength(0);
    });
  });

  describe("getProjectTags", () => {
    it("returns empty array for project with no tags", async () => {
      const tags = await getProjectTags(projectId);
      expect(tags).toEqual([]);
    });

    it("returns all tags for a project", async () => {
      await addTagToProject(projectId, "frontend");
      await addTagToProject(projectId, "mobile");
      await addTagToProject(projectId, "react");

      const tags = await getProjectTags(projectId);
      expect(tags).toHaveLength(3);
    });
  });

  describe("getProjectsForOrganization (with tags)", () => {
    it("includes tags in project list", async () => {
      await addTagToProject(projectId, "frontend");
      await addTagToProject(projectId, "mobile");

      const projects = await getProjectsForOrganization(orgId);
      expect(projects).toHaveLength(1);
      expect(projects[0].tags.sort()).toEqual(["frontend", "mobile"]);
    });

    it("returns empty tags array for projects without tags", async () => {
      const projects = await getProjectsForOrganization(orgId);
      expect(projects).toHaveLength(1);
      expect(projects[0].tags).toEqual([]);
    });

    it("returns tags per project independently", async () => {
      const project2 = await createProject(db, orgId, {
        name: "Project 2",
        slug: "project-2",
      });

      await addTagToProject(projectId, "frontend");
      await addTagToProject(project2.id, "backend");
      await addTagToProject(project2.id, "api");

      const projects = await getProjectsForOrganization(orgId);
      expect(projects).toHaveLength(2);

      const p1 = projects.find((p) => p.id === projectId)!;
      const p2 = projects.find((p) => p.id === project2.id)!;

      expect(p1.tags).toEqual(["frontend"]);
      expect(p2.tags.sort()).toEqual(["api", "backend"]);
    });
  });
});
