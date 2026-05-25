import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
// GoogleAuth.initialize();
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));



// import { environment } from './environments/environment'; // 👈 Import config
// import { initializeApp } from 'firebase/app';

// initializeApp(environment.firebase); //  Khởi tạo Firebase tại đây

// Boot Angular app
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// bootstrapApplication(AppComponent)
//   .catch(err => console.error(err));



//  Firebase khởi tạo
// import { environment } from './environments/environment';
// import { initializeApp } from 'firebase/app';
// initializeApp(environment.firebase); // hoặc firebaseConfig nếu bạn đổi tên key

// //  Bootstrap Angular theo kiểu truyền thống (NgModule)
// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import { AppModule } from './app/app.module';

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.error(err));
