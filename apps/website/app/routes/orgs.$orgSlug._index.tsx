import {
  Heading,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
  Badge,
  Wrap,
} from "@chakra-ui/react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { LuPlus, LuX } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug._index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { useTranslation } from "react-i18next";
import { getProjectUrl } from "~/lib/routes-helpers";
import { getProjectsForOrganization } from "~/lib/projects.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Get projects for the organization
  const projects = await getProjectsForOrganization(organization.id);

  // Collect all unique tags
  const allTags = [...new Set(projects.flatMap((p) => p.tags))].sort();

  return { organization, projects, allTags };
}

export default function OrganizationProjects() {
  const { t } = useTranslation();
  const { organization, projects, allTags } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTag = searchParams.get("tag");

  const filteredProjects = selectedTag
    ? projects.filter((p) => p.tags.includes(selectedTag))
    : projects;

  function handleTagFilter(tag: string) {
    setSearchParams((prev) => {
      if (prev.get("tag") === tag) {
        prev.delete("tag");
      } else {
        prev.set("tag", tag);
      }
      return prev;
    });
  }

  function clearTagFilter() {
    setSearchParams((prev) => {
      prev.delete("tag");
      return prev;
    });
  }

  return (
    <Box pt={6}>
      <HStack justify="space-between" mb={4}>
        <Heading as="h2" size="lg">
          {t("orgs.projects")}
        </Heading>
        <Button asChild colorPalette="brand" size="sm">
          <Link to={`/orgs/${organization.slug}/projects/new`}>
            <LuPlus /> {t("projects.new.title")}
          </Link>
        </Button>
      </HStack>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <Box mb={4}>
          <Text fontSize="sm" color="fg.muted" mb={2}>
            {t("projects.tags.filterByTag")}
          </Text>
          <Wrap gap={2}>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                cursor="pointer"
                colorPalette={selectedTag === tag ? "brand" : "gray"}
                variant={selectedTag === tag ? "solid" : "subtle"}
                onClick={() => handleTagFilter(tag)}
                size="md"
              >
                {tag}
              </Badge>
            ))}
            {selectedTag && (
              <Badge
                cursor="pointer"
                colorPalette="red"
                variant="outline"
                onClick={clearTagFilter}
                size="md"
              >
                <LuX /> {t("projects.tags.clearFilter")}
              </Badge>
            )}
          </Wrap>
        </Box>
      )}

      {projects.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("orgs.noProjects")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link to={`/orgs/${organization.slug}/projects/new`}>
              <LuPlus /> {t("projects.new.firstProject")}
            </Link>
          </Button>
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("projects.tags.noProjectsWithTag", { tag: selectedTag })}
          </Text>
          <Badge
            cursor="pointer"
            colorPalette="red"
            variant="outline"
            onClick={clearTagFilter}
            size="md"
          >
            <LuX /> {t("projects.tags.clearFilter")}
          </Badge>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {filteredProjects.map((project) => (
            <Card.Root key={project.id} asChild>
              <Link to={getProjectUrl(organization.slug, project.slug)}>
                <Card.Body>
                  <Heading as="h3" size="md" mb={1}>
                    {project.name}
                  </Heading>
                  <Text fontSize="xs" color="fg.subtle" mb={1}>
                    {t("projects.keyCount", {
                      count: project.translationKeyCount,
                    })}
                  </Text>
                  {project.description && (
                    <Text fontSize="sm" color="fg.muted">
                      {project.description}
                    </Text>
                  )}
                  {project.tags.length > 0 && (
                    <Wrap gap={1} mt={2}>
                      {project.tags.map((tag) => (
                        <Badge
                          key={tag}
                          size="sm"
                          colorPalette="brand"
                          variant="subtle"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </Wrap>
                  )}
                </Card.Body>
              </Link>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
