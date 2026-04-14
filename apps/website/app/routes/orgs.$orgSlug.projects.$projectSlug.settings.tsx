import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
  Badge,
  Input,
  Field,
  Wrap,
} from "@chakra-ui/react";
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from "react-router";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.settings";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getProjectBySlug,
  getProjectLanguages,
  addLanguageToProject,
  removeLanguageFromProject,
  addTagToProject,
  removeTagFromProject,
  getProjectTags,
} from "~/lib/projects.server";
import { useTranslation } from "react-i18next";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
  tags: Array<{ id: string; name: string }>;
};

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  return {};
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "add_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    // Vérifier que la langue n'existe pas déjà
    const existingLanguages = await getProjectLanguages(project.id);
    if (existingLanguages.some((l) => l.locale === locale)) {
      return { error: `La langue "${locale}" existe deja` };
    }

    await addLanguageToProject({
      projectId: project.id,
      locale,
      isDefault: existingLanguages.length === 0,
    });

    return { success: true };
  }

  if (action === "remove_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    await removeLanguageFromProject(project.id, locale);

    return { success: true };
  }

  if (action === "add_tag") {
    const tagName = formData.get("tag");

    if (!tagName || typeof tagName !== "string" || !tagName.trim()) {
      return { error: "Le nom du tag est requis" };
    }

    const existingTags = await getProjectTags(project.id);
    if (existingTags.some((t) => t.name === tagName.trim())) {
      return { error: `Le tag "${tagName.trim()}" existe déjà` };
    }

    await addTagToProject(project.id, tagName.trim());

    return { success: true };
  }

  if (action === "remove_tag") {
    const tagName = formData.get("tag");

    if (!tagName || typeof tagName !== "string") {
      return { error: "Le nom du tag est requis" };
    }

    await removeTagFromProject(project.id, tagName);

    return { success: true };
  }

  return { error: "Action invalide" };
}

export default function ProjectSettings() {
  const { organization, project, languages, tags } =
    useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const { t } = useTranslation();

  return (
    <VStack gap={8} align="stretch">
      {/* Informations du projet */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("settings.projectInformation")}
        </Heading>
        <VStack gap={2} align="stretch">
          <Box>
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              {t("settings.projectName")}
            </Text>
            <Text>{project.name}</Text>
          </Box>
          {project.description && (
            <Box>
              <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                {t("settings.projectDescription")}
              </Text>
              <Text>{project.description}</Text>
            </Box>
          )}
          <Box>
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              {t("settings.projectSlug")}
            </Text>
            <Text fontFamily="mono" fontSize="sm">
              /{organization.slug}/{project.slug}
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* Tags */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("settings.tags.title", { count: tags.length })}
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md" mb={4}>
            {actionData.error}
          </Box>
        )}

        {actionData?.success && (
          <Box
            p={4}
            bg="green.subtle"
            color="green.fg"
            borderRadius="md"
            mb={4}
          >
            {t("settings.tags.actionSuccess")}
          </Box>
        )}

        {tags.length > 0 && (
          <Wrap gap={2} mb={4}>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                colorPalette="brand"
                variant="subtle"
                size="lg"
              >
                <HStack gap={1}>
                  <Text>{tag.name}</Text>
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="_action" value="remove_tag" />
                    <input type="hidden" name="tag" value={tag.name} />
                    <Button
                      type="submit"
                      size="2xs"
                      variant="ghost"
                      colorPalette="red"
                      disabled={isSubmitting}
                      minW="auto"
                      p={0}
                    >
                      <LuTrash2 />
                    </Button>
                  </Form>
                </HStack>
              </Badge>
            ))}
          </Wrap>
        )}

        {tags.length === 0 && (
          <Box
            p={6}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            mb={4}
          >
            <Text color="fg.muted">{t("settings.tags.noTags")}</Text>
          </Box>
        )}

        <Form method="post">
          <input type="hidden" name="_action" value="add_tag" />
          <HStack>
            <Field.Root flex={1}>
              <Input
                name="tag"
                placeholder={t("settings.tags.placeholder")}
                disabled={isSubmitting}
              />
            </Field.Root>
            <Button type="submit" colorPalette="brand" loading={isSubmitting}>
              <LuPlus /> {t("settings.tags.addTag")}
            </Button>
          </HStack>
        </Form>
      </Box>

      {/* Langues */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("settings.languages", { count: languages.length })}
        </Heading>

        {languages.length === 0 ? (
          <Box
            p={10}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            mb={4}
          >
            <Text color="fg.muted" mb={4}>
              {t("settings.noLanguages")}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
            {languages.map((lang) => (
              <Card.Root key={lang.id}>
                <Card.Body>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontWeight="medium">{lang.locale}</Text>
                      {lang.isDefault && (
                        <Badge colorPalette="brand" size="sm">
                          {t("settings.default")}
                        </Badge>
                      )}
                    </Box>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="_action"
                        value="remove_language"
                      />
                      <input type="hidden" name="locale" value={lang.locale} />
                      <Button
                        type="submit"
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        disabled={isSubmitting}
                      >
                        <LuTrash2 />
                      </Button>
                    </Form>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        )}

        <Form method="post">
          <input type="hidden" name="_action" value="add_language" />
          <HStack>
            <Field.Root flex={1}>
              <Input
                name="locale"
                placeholder="fr, en, de..."
                disabled={isSubmitting}
              />
            </Field.Root>
            <Button type="submit" colorPalette="brand" loading={isSubmitting}>
              <LuPlus /> {t("settings.addLanguage")}
            </Button>
          </HStack>
        </Form>
      </Box>
    </VStack>
  );
}
