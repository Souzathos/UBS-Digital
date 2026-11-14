import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'

// Módulos nativos que não existem no Node: os testes usam os mocks oficiais de cada pacote.
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)
