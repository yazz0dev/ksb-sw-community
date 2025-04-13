<template>
    <CContainer maxW="6xl" py="6">
        <CHeading as="h2" size="xl" color="text-primary" mb="6">Resources</CHeading>

        <!-- Empty State -->
        <CAlert v-if="categories.length === 0" status="info" variant="subtle" borderRadius="md">
            <CAlertIcon />
            <CAlertDescription>No resources available at the moment.</CAlertDescription>
        </CAlert>

        <!-- Resource Categories Grid -->
        <CSimpleGrid v-else columns={{ base: 1, md: 2, lg: 3 }} spacing="6">
            <CBox v-for="(category, index) in categories" :key="index">
                <CCard variant="outline" shadow="md" transition="all 0.2s" _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}>
                    <CCardHeader bg="gray.50" borderBottomWidth="1px" borderColor="gray.200">
                        <CHeading size="sm" color="text-primary">{{ category.title }}</CHeading>
                    </CCardHeader>
                    <CCardBody p="0">
                        <CList v-if="category.items && category.items.length > 0" divider={<CDivider />}>
                            <CListItem v-for="(resource, rIndex) in category.items" :key="rIndex" p="3" _hover={{ bg: 'gray.50' }}>
                                <CLink 
                                    :href="resource.content"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    d="flex"
                                    justify="space-between"
                                    align="center"
                                    color="text-secondary"
                                    _hover={{ color: 'primary', textDecoration: 'none' }}
                                >
                                    <CFlex align="center" minW="0">
                                        <CIcon :name="getIconClass(resource.type)" mr="2" color="gray.400" />
                                        <CText isTruncated>{{ resource.title }}</CText>
                                    </CFlex>
                                    <CIcon 
                                        name="external-link-alt" 
                                        color="gray.400"
                                        opacity="0"
                                        transition="opacity 0.15s"
                                        _groupHover={{ opacity: 0.6 }}
                                    />
                                </CLink>
                            </CListItem>
                        </CList>
                        <CBox v-else p="4" color="text-disabled" fontSize="sm">
                            No items in this category.
                        </CBox>
                    </CCardBody>
                </CCard>
            </CBox>
        </CSimpleGrid>
    </CContainer>
</template>

<script setup>
import { ref } from 'vue';
import {
    Container as CContainer,
    Box as CBox,
    Heading as CHeading,
    SimpleGrid as CSimpleGrid,
    Card as CCard,
    CardHeader as CCardHeader,
    CardBody as CCardBody,
    List as CList,
    ListItem as CListItem,
    Link as CLink,
    Text as CText,
    Flex as CFlex,
    Icon as CIcon,
    Divider as CDivider,
    Alert as CAlert,
    AlertIcon as CAlertIcon,
    AlertDescription as CAlertDescription
} from '@chakra-ui/vue-next';

// Static predefined resources
const predefinedResources = ref([
    {
        title: "Getting Started",
        items: [
            { title: "Student Handbook", type: "Download", content: "#" }, 
            { title: "Code of Conduct", type: "Guide", content: "#" }
        ]
    },
    {
        title: "Development Tools",
        items: [
            { title: "Git Installation Guide", type: "Guide", content: "https://git-scm.com/downloads" },
            { title: "VS Code Editor", type: "Link", content: "https://code.visualstudio.com/" },
            { title: "Node.js Setup", type: "Guide", content: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs" }
        ]
    },
    {
        title: "Learning Materials",
        items: [
            { title: "JavaScript Fundamentals", type: "Link", content: "https://javascript.info/" },
            { title: "Vue.js Documentation", type: "Link", content: "https://vuejs.org/guide/introduction.html" },
            { title: "Web Development Roadmap", type: "Guide", content: "https://roadmap.sh/frontend" }
        ]
    },
     {
        title: "Community Links",
        items: [
            { title: "KSB GitHub Organization", type: "Link", content: "#" }
        ]
    }
]);

const categories = predefinedResources;

// Helper function for icons
const getIconClass = (type) => {
    switch (type) {
        case 'Download': return 'fa-download';
        case 'Guide': return 'fa-book';
        case 'Link': return 'fa-link';
        default: return 'fa-file';
    }
};
</script>
