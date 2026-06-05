export type RootStackParamList = {
  Tabs: undefined;
  Import: undefined;
  Export: undefined;
  Settings: undefined;
  Assistant: undefined;
  NoteDetail: { noteId: string };
  NoteEditor: { noteId?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Review: undefined;
  Favorites: undefined;
  Profile: undefined;
};